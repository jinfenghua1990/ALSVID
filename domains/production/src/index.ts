import type { AuditService } from '@alsvid/audit';
import type { Database } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const ProductionCapability = {
  Read: 'production.read',
  Write: 'production.write',
  Release: 'production.release',
  QcInspect: 'qc.inspect',
} as const;

export type QcResult = 'PASS' | 'FAIL' | 'HOLD';
export class ProductionValidationError extends Error {}
export class ProductionNotFoundError extends Error {}
export class ProductionConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new ProductionValidationError(`${name} must be a positive integer`);
  return value;
}

function positiveDecimal(value: string | number, name: string): string {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text) || Number(text) <= 0) throw new ProductionValidationError(`${name} must be a positive decimal`);
  return text;
}

export class ProductionService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async summary(actor: AuthContext): Promise<any> {
    requireCapability(actor, ProductionCapability.Read);
    const [orders, units, inspections, deviations, history] = await Promise.all([
      this.database.query<any>(`SELECT po.*, bs.code AS build_spec_code, s.sku, p.partner_code, p.display_name AS factory_name,
        (SELECT count(*)::int FROM production.production_units u WHERE u.production_order_id=po.id) AS unit_count
        FROM production.production_orders po
        JOIN engineering.build_specs bs ON bs.id=po.build_spec_id
        JOIN product.skus s ON s.id=bs.sku_id
        JOIN partners.partners p ON p.id=po.factory_partner_id
        ORDER BY po.created_at DESC LIMIT 200`),
      this.database.query<any>(`SELECT u.*, po.production_order_number FROM production.production_units u JOIN production.production_orders po ON po.id=u.production_order_id ORDER BY po.created_at DESC,u.unit_no LIMIT 2000`),
      this.database.query<any>(`SELECT q.*, u.production_order_id,u.unit_no FROM production.qc_inspections q JOIN production.production_units u ON u.id=q.production_unit_id ORDER BY q.inspected_at DESC LIMIT 2000`),
      this.database.query<any>(`SELECT d.*, ep.part_number AS expected_part_number, ap.part_number AS actual_part_number FROM production.as_built_deviations d JOIN engineering.parts ep ON ep.id=d.expected_part_id JOIN engineering.parts ap ON ap.id=d.actual_part_id ORDER BY d.created_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT * FROM production.order_state_history ORDER BY occurred_at DESC LIMIT 1000`),
    ]);
    return { orders: orders.rows, units: units.rows, inspections: inspections.rows, deviations: deviations.rows, history: history.rows };
  }

  async createOrder(actor: AuthContext, input: { buildSpecId: string; factoryPartnerId: string; sourcePurchaseOrderId?: string; plannedQuantity: number; plannedStartDate?: string; plannedCompletionDate?: string; note?: string }): Promise<any> {
    requireCapability(actor, ProductionCapability.Write);
    positiveInteger(input.plannedQuantity, 'plannedQuantity');
    if (!input.buildSpecId || !input.factoryPartnerId) throw new ProductionValidationError('buildSpecId and factoryPartnerId are required');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO production.production_orders(build_spec_id,factory_partner_id,source_purchase_order_id,planned_quantity,planned_start_date,planned_completion_date,note,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
        [input.buildSpecId,input.factoryPartnerId,input.sourcePurchaseOrderId||null,input.plannedQuantity,input.plannedStartDate||null,input.plannedCompletionDate||null,input.note?.trim()??'',actor.userId],
      );
      await this.audit.record({ actorUserId:actor.userId,action:'production.order_created',targetType:'production.order',targetId:result.rows[0].id });
      return result.rows[0];
    } catch (error:any) {
      const message=String(error?.message??'');
      if (message.includes('released Build Specification')) throw new ProductionValidationError('Production Order requires a released Build Specification');
      if (message.includes('FACTORY Partner role')) throw new ProductionValidationError('Selected Partner is not a Factory');
      if (message.includes('source purchase order')) throw new ProductionValidationError(message);
      if (error?.code==='23503') throw new ProductionNotFoundError('Build Specification, Factory or source PO not found');
      throw error;
    }
  }

  async releaseOrder(actor: AuthContext, orderId: string): Promise<any> {
    requireCapability(actor, ProductionCapability.Release);
    return this.database.transaction(async (client) => {
      const updated=await client.query<any>(
        `UPDATE production.production_orders SET status='RELEASED',released_at=now(),version=version+1,updated_by=$2,updated_at=now()
         WHERE id=$1 AND status='DRAFT' RETURNING *`,[orderId,actor.userId]);
      if(!updated.rows[0]) throw new ProductionConflictError('Production Order is missing or no longer draft');
      await client.query(
        `INSERT INTO production.production_units(production_order_id,unit_no,updated_by)
         SELECT $1, n, $2 FROM generate_series(1,$3::integer) AS n`,[orderId,actor.userId,updated.rows[0].planned_quantity]);
      await this.audit.record({actorUserId:actor.userId,action:'production.order_released',targetType:'production.order',targetId:orderId,metadata:{plannedQuantity:updated.rows[0].planned_quantity}},client);
      return updated.rows[0];
    });
  }

  async startOrder(actor: AuthContext, orderId: string): Promise<any> {
    requireCapability(actor, ProductionCapability.Write);
    const result=await this.database.query<any>(
      `UPDATE production.production_orders SET status='IN_PROGRESS',started_at=now(),version=version+1,updated_by=$2,updated_at=now()
       WHERE id=$1 AND status='RELEASED' RETURNING *`,[orderId,actor.userId]);
    if(!result.rows[0]) throw new ProductionConflictError('Only released Production Orders can start');
    await this.audit.record({actorUserId:actor.userId,action:'production.order_started',targetType:'production.order',targetId:orderId});
    return result.rows[0];
  }

  async markUnitAssembled(actor: AuthContext, unitId: string): Promise<any> {
    requireCapability(actor, ProductionCapability.Write);
    const result=await this.database.query<any>(
      `UPDATE production.production_units u SET status='ASSEMBLED',assembly_started_at=COALESCE(assembly_started_at,now()),assembly_completed_at=now(),updated_by=$2,updated_at=now()
       FROM production.production_orders po
       WHERE u.id=$1 AND po.id=u.production_order_id AND po.status='IN_PROGRESS' AND u.status IN ('PLANNED','ASSEMBLING') RETURNING u.*`,[unitId,actor.userId]);
    if(!result.rows[0]) throw new ProductionConflictError('Unit must belong to an in-progress order and not already be assembled');
    await this.audit.record({actorUserId:actor.userId,action:'production.unit_assembled',targetType:'production.unit',targetId:unitId});
    return result.rows[0];
  }

  async moveOrderToQc(actor: AuthContext, orderId: string): Promise<any> {
    requireCapability(actor, ProductionCapability.Write);
    return this.database.transaction(async(client)=>{
      const blocked=await client.query<{count:string}>(`SELECT count(*)::text AS count FROM production.production_units WHERE production_order_id=$1 AND status NOT IN ('ASSEMBLED','QC_PENDING','QC_PASSED','QC_FAILED','HOLD')`,[orderId]);
      if(blocked.rows[0]?.count!=='0') throw new ProductionConflictError('All production units must be assembled before QC');
      const updated=await client.query<any>(`UPDATE production.production_orders SET status='QC_PENDING',qc_pending_at=now(),version=version+1,updated_by=$2,updated_at=now() WHERE id=$1 AND status='IN_PROGRESS' RETURNING *`,[orderId,actor.userId]);
      if(!updated.rows[0]) throw new ProductionConflictError('Only in-progress Production Orders can enter QC');
      await client.query(`UPDATE production.production_units SET status='QC_PENDING',updated_by=$2,updated_at=now() WHERE production_order_id=$1 AND status='ASSEMBLED'`,[orderId,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'production.order_qc_pending',targetType:'production.order',targetId:orderId},client);
      return updated.rows[0];
    });
  }

  async inspectUnit(actor: AuthContext, unitId: string, input: { result: QcResult; checklistCode?: string; checklist?: Record<string,unknown>; note?: string }): Promise<any> {
    requireCapability(actor, ProductionCapability.QcInspect);
    if(!['PASS','FAIL','HOLD'].includes(input.result)) throw new ProductionValidationError('result must be PASS, FAIL or HOLD');
    return this.database.transaction(async(client)=>{
      const unit=await client.query<any>(`SELECT u.*,po.status AS order_status FROM production.production_units u JOIN production.production_orders po ON po.id=u.production_order_id WHERE u.id=$1 FOR UPDATE OF u`,[unitId]);
      if(!unit.rows[0]) throw new ProductionNotFoundError('Production unit not found');
      if(unit.rows[0].order_status!=='QC_PENDING') throw new ProductionConflictError('Production Order must be QC_PENDING');
      if(['QC_FAILED','HOLD'].includes(unit.rows[0].status)) await client.query(`UPDATE production.production_units SET status='QC_PENDING',updated_by=$2,updated_at=now() WHERE id=$1`,[unitId,actor.userId]);
      if(unit.rows[0].status==='ASSEMBLED') await client.query(`UPDATE production.production_units SET status='QC_PENDING',updated_by=$2,updated_at=now() WHERE id=$1`,[unitId,actor.userId]);
      const inspection=await client.query<any>(
        `INSERT INTO production.qc_inspections(production_unit_id,result,checklist_code,checklist,note,inspected_by)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6) RETURNING *`,[unitId,input.result,input.checklistCode?.trim()||null,JSON.stringify(input.checklist??{}),input.note?.trim()??'',actor.userId]);
      const next=input.result==='PASS'?'QC_PASSED':input.result==='FAIL'?'QC_FAILED':'HOLD';
      await client.query(`UPDATE production.production_units SET status=$2,updated_by=$3,updated_at=now() WHERE id=$1`,[unitId,next,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'production.qc_inspected',targetType:'production.unit',targetId:unitId,metadata:{inspectionId:inspection.rows[0].id,result:input.result}},client);
      return inspection.rows[0];
    });
  }

  async recordDeviation(actor: AuthContext, unitId: string, input: { expectedPartId:string; actualPartId:string; quantity:string|number; serialNumber?:string; reason:string }): Promise<any> {
    requireCapability(actor, ProductionCapability.Write);
    if(!input.reason?.trim()) throw new ProductionValidationError('Deviation reason is required');
    const result=await this.database.query<any>(
      `INSERT INTO production.as_built_deviations(production_unit_id,expected_part_id,actual_part_id,quantity,serial_number,reason,approved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[unitId,input.expectedPartId,input.actualPartId,positiveDecimal(input.quantity,'quantity'),input.serialNumber?.trim()||null,input.reason.trim(),actor.userId]);
    await this.audit.record({actorUserId:actor.userId,action:'production.deviation_recorded',targetType:'production.unit',targetId:unitId,metadata:{deviationId:result.rows[0].id}},this.database);
    return result.rows[0];
  }

  async completeOrder(actor: AuthContext, orderId: string): Promise<any> {
    requireCapability(actor, ProductionCapability.Release);
    const blocked=await this.database.query<{count:string}>(`SELECT count(*)::text AS count FROM production.production_units WHERE production_order_id=$1 AND status<>'QC_PASSED'`,[orderId]);
    if(blocked.rows[0]?.count!=='0') throw new ProductionConflictError('Every production unit must be QC_PASSED before completion');
    const result=await this.database.query<any>(`UPDATE production.production_orders SET status='COMPLETED',completed_at=now(),version=version+1,updated_by=$2,updated_at=now() WHERE id=$1 AND status='QC_PENDING' RETURNING *`,[orderId,actor.userId]);
    if(!result.rows[0]) throw new ProductionConflictError('Only QC-pending Production Orders can complete');
    await this.audit.record({actorUserId:actor.userId,action:'production.order_completed',targetType:'production.order',targetId:orderId});
    return result.rows[0];
  }
}
