import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const ProcurementCapability = {
  Read: 'procurement.read',
  Write: 'procurement.write',
  Issue: 'procurement.issue',
  Confirm: 'procurement.confirm',
  Receive: 'procurement.receive',
} as const;

export type ProcurementItemType = 'PART' | 'SKU';
export type PurchaseOrderStatus = 'DRAFT' | 'ISSUED' | 'CONFIRMED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
export class ProcurementValidationError extends Error {}
export class ProcurementNotFoundError extends Error {}
export class ProcurementConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new ProcurementValidationError('currency must be a three-letter ISO code');
  return currency;
}

function normalizeUnit(value?: string): string {
  const unit = value?.trim().toUpperCase() || 'EA';
  if (!/^[A-Z0-9_-]{1,12}$/.test(unit)) throw new ProcurementValidationError('Invalid unit');
  return unit;
}

function positiveDecimal(value: string | number, name: string): string {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text) || Number(text) <= 0) throw new ProcurementValidationError(`${name} must be a positive decimal with at most 6 decimal places`);
  return text;
}

function nonNegativeMoney(value: string | number): string {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new ProcurementValidationError('unitPrice must be a non-negative decimal with at most 6 decimal places');
  return text;
}

export interface ProcurementLineInput {
  itemType: ProcurementItemType;
  itemId: string;
  quantity: string | number;
  unitPrice: string | number;
  unit?: string;
  supplierItemReference?: string;
  description?: string;
  requestedDate?: string;
}

function lineRefs(input: ProcurementLineInput): { partId: string | null; skuId: string | null } {
  if (!['PART','SKU'].includes(input.itemType)) throw new ProcurementValidationError('itemType must be PART or SKU');
  if (!input.itemId) throw new ProcurementValidationError('itemId is required');
  return input.itemType === 'PART' ? { partId: input.itemId, skuId: null } : { partId: null, skuId: input.itemId };
}

async function insertQuotationLine(executor: QueryExecutor, quotationId: string, lineNo: number, input: ProcurementLineInput): Promise<void> {
  const refs = lineRefs(input);
  await executor.query(
    `INSERT INTO procurement.quotation_lines(quotation_id,line_no,item_type,part_id,sku_id,supplier_item_reference,description,quantity,unit,unit_price,requested_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [quotationId, lineNo, input.itemType, refs.partId, refs.skuId, input.supplierItemReference?.trim() || null, input.description?.trim() ?? '', positiveDecimal(input.quantity,'quantity'), normalizeUnit(input.unit), nonNegativeMoney(input.unitPrice), input.requestedDate || null],
  );
}

async function insertPurchaseOrderLine(executor: QueryExecutor, poId: string, lineNo: number, input: ProcurementLineInput): Promise<void> {
  const refs = lineRefs(input);
  await executor.query(
    `INSERT INTO procurement.purchase_order_lines(purchase_order_id,line_no,item_type,part_id,sku_id,supplier_item_reference,description,ordered_quantity,unit,unit_price,requested_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [poId, lineNo, input.itemType, refs.partId, refs.skuId, input.supplierItemReference?.trim() || null, input.description?.trim() ?? '', positiveDecimal(input.quantity,'quantity'), normalizeUnit(input.unit), nonNegativeMoney(input.unitPrice), input.requestedDate || null],
  );
}

export class ProcurementService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async summary(actor: AuthContext): Promise<any> {
    requireCapability(actor, ProcurementCapability.Read);
    const [quotations, quoteLines, purchaseOrders, poLines, confirmations, confirmationLines, receipts, receiptLines, snapshots] = await Promise.all([
      this.database.query<any>(`SELECT q.*, p.partner_code, p.display_name AS supplier_name FROM procurement.quotations q JOIN partners.partners p ON p.id=q.supplier_partner_id ORDER BY q.created_at DESC LIMIT 200`),
      this.database.query<any>(`SELECT l.*, p.part_number, s.sku FROM procurement.quotation_lines l LEFT JOIN engineering.parts p ON p.id=l.part_id LEFT JOIN product.skus s ON s.id=l.sku_id ORDER BY l.quotation_id,l.line_no`),
      this.database.query<any>(`SELECT po.*, p.partner_code, p.display_name AS supplier_name, COALESCE((SELECT sum(l.ordered_quantity*l.unit_price) FROM procurement.purchase_order_lines l WHERE l.purchase_order_id=po.id),0)::text AS total_amount FROM procurement.purchase_orders po JOIN partners.partners p ON p.id=po.supplier_partner_id ORDER BY po.created_at DESC LIMIT 200`),
      this.database.query<any>(`SELECT l.*, p.part_number, s.sku FROM procurement.purchase_order_lines l LEFT JOIN engineering.parts p ON p.id=l.part_id LEFT JOIN product.skus s ON s.id=l.sku_id ORDER BY l.purchase_order_id,l.line_no`),
      this.database.query<any>(`SELECT * FROM procurement.supplier_confirmations ORDER BY confirmed_at DESC LIMIT 500`),
      this.database.query<any>(`SELECT * FROM procurement.supplier_confirmation_lines ORDER BY confirmation_id`),
      this.database.query<any>(`SELECT * FROM procurement.receipts ORDER BY created_at DESC LIMIT 500`),
      this.database.query<any>(`SELECT * FROM procurement.receipt_lines ORDER BY receipt_id`),
      this.database.query<any>(`SELECT id,purchase_order_id,state,po_version,snapshot,created_at FROM procurement.purchase_order_snapshots ORDER BY created_at DESC LIMIT 500`),
    ]);
    return { quotations: quotations.rows, quoteLines: quoteLines.rows, purchaseOrders: purchaseOrders.rows, purchaseOrderLines: poLines.rows, confirmations: confirmations.rows, confirmationLines: confirmationLines.rows, receipts: receipts.rows, receiptLines: receiptLines.rows, snapshots: snapshots.rows };
  }

  async createQuotation(actor: AuthContext, input: { supplierPartnerId: string; supplierReference?: string; currency: string; validUntil?: string; incoterm?: string; paymentTerms?: string; lines: ProcurementLineInput[] }): Promise<any> {
    requireCapability(actor, ProcurementCapability.Write);
    if (!input.supplierPartnerId) throw new ProcurementValidationError('supplierPartnerId is required');
    if (!Array.isArray(input.lines) || input.lines.length < 1) throw new ProcurementValidationError('At least one quotation line is required');
    try {
      const id = await this.database.transaction(async (client) => {
        const header = await client.query<{ id: string }>(
          `INSERT INTO procurement.quotations(supplier_partner_id,supplier_reference,currency,valid_until,incoterm,payment_terms,created_by,updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
          [input.supplierPartnerId, input.supplierReference?.trim() || null, normalizeCurrency(input.currency), input.validUntil || null, input.incoterm?.trim().toUpperCase() || null, input.paymentTerms?.trim() ?? '', actor.userId],
        );
        for (const [index,line] of input.lines.entries()) await insertQuotationLine(client, header.rows[0]!.id, (index+1)*10, line);
        await this.audit.record({ actorUserId: actor.userId, action:'procurement.quotation_created', targetType:'procurement.quotation', targetId:header.rows[0]!.id }, client);
        return header.rows[0]!.id;
      });
      return (await this.database.query<any>('SELECT * FROM procurement.quotations WHERE id=$1',[id])).rows[0];
    } catch (error:any) {
      if (String(error?.message).includes('SUPPLIER or FACTORY')) throw new ProcurementValidationError('Selected Partner is not a Supplier or Factory');
      if (error?.code === '23503') throw new ProcurementNotFoundError('Supplier or item not found');
      throw error;
    }
  }

  async setQuotationStatus(actor: AuthContext, quotationId: string, status: 'RECEIVED'|'ACCEPTED'|'REJECTED'|'EXPIRED'): Promise<any> {
    requireCapability(actor, ProcurementCapability.Write);
    const result = await this.database.query<any>(
      `UPDATE procurement.quotations SET status=$2,version=version+1,updated_by=$3,updated_at=now()
       WHERE id=$1 AND status='DRAFT' RETURNING *`,
      [quotationId,status,actor.userId],
    );
    if (!result.rows[0]) throw new ProcurementConflictError('Quotation is missing or no longer draft');
    await this.audit.record({ actorUserId:actor.userId, action:'procurement.quotation_status_changed', targetType:'procurement.quotation', targetId:quotationId, metadata:{status} });
    return result.rows[0];
  }

  async createPurchaseOrder(actor: AuthContext, input: { supplierPartnerId: string; sourceQuotationId?: string; supplierReference?: string; currency: string; incoterm?: string; paymentTerms?: string; depositTerms?: string; lines: ProcurementLineInput[] }): Promise<any> {
    requireCapability(actor, ProcurementCapability.Write);
    if (!input.supplierPartnerId) throw new ProcurementValidationError('supplierPartnerId is required');
    if (!Array.isArray(input.lines) || input.lines.length < 1) throw new ProcurementValidationError('At least one PO line is required');
    try {
      const id = await this.database.transaction(async (client) => {
        const header = await client.query<{ id:string }>(
          `INSERT INTO procurement.purchase_orders(supplier_partner_id,source_quotation_id,supplier_reference,currency,incoterm,payment_terms,deposit_terms,created_by,updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
          [input.supplierPartnerId,input.sourceQuotationId||null,input.supplierReference?.trim()||null,normalizeCurrency(input.currency),input.incoterm?.trim().toUpperCase()||null,input.paymentTerms?.trim()??'',input.depositTerms?.trim()??'',actor.userId],
        );
        for (const [index,line] of input.lines.entries()) await insertPurchaseOrderLine(client,header.rows[0]!.id,(index+1)*10,line);
        await this.audit.record({actorUserId:actor.userId,action:'procurement.po_created',targetType:'procurement.purchase_order',targetId:header.rows[0]!.id},client);
        return header.rows[0]!.id;
      });
      return (await this.database.query<any>('SELECT * FROM procurement.purchase_orders WHERE id=$1',[id])).rows[0];
    } catch (error:any) {
      if (String(error?.message).includes('SUPPLIER or FACTORY')) throw new ProcurementValidationError('Selected Partner is not a Supplier or Factory');
      if (error?.code === '23503') throw new ProcurementNotFoundError('Supplier, source quotation or item not found');
      throw error;
    }
  }

  async issuePurchaseOrder(actor: AuthContext, poId: string): Promise<any> {
    requireCapability(actor, ProcurementCapability.Issue);
    const result = await this.database.query<any>(
      `UPDATE procurement.purchase_orders SET status='ISSUED',issued_at=now(),version=version+1,updated_by=$2,updated_at=now()
       WHERE id=$1 AND status='DRAFT' AND EXISTS (SELECT 1 FROM procurement.purchase_order_lines l WHERE l.purchase_order_id=$1) RETURNING *`,
      [poId,actor.userId],
    );
    if (!result.rows[0]) throw new ProcurementConflictError('PO must be a non-empty draft before issue');
    await this.audit.record({actorUserId:actor.userId,action:'procurement.po_issued',targetType:'procurement.purchase_order',targetId:poId});
    return result.rows[0];
  }

  async confirmPurchaseOrder(actor: AuthContext, poId: string, input: { supplierReference?: string; note?: string; lines: Array<{ purchaseOrderLineId: string; confirmedQuantity: string|number; confirmedDate?: string; note?: string }> }): Promise<any> {
    requireCapability(actor, ProcurementCapability.Confirm);
    if (!Array.isArray(input.lines) || input.lines.length < 1) throw new ProcurementValidationError('At least one confirmation line is required');
    return this.database.transaction(async (client) => {
      const locked = await client.query<any>(`SELECT id,status FROM procurement.purchase_orders WHERE id=$1 FOR UPDATE`,[poId]);
      if (!locked.rows[0]) throw new ProcurementNotFoundError('Purchase order not found');
      if (locked.rows[0].status !== 'ISSUED') throw new ProcurementConflictError('Only issued POs can be supplier-confirmed');
      const confirmation = await client.query<{id:string}>(
        `INSERT INTO procurement.supplier_confirmations(purchase_order_id,supplier_reference,note,recorded_by) VALUES ($1,$2,$3,$4) RETURNING id`,
        [poId,input.supplierReference?.trim()||null,input.note?.trim()??'',actor.userId],
      );
      for (const line of input.lines) {
        await client.query(
          `INSERT INTO procurement.supplier_confirmation_lines(confirmation_id,purchase_order_line_id,confirmed_quantity,confirmed_date,note)
           VALUES ($1,$2,$3,$4,$5)`,
          [confirmation.rows[0]!.id,line.purchaseOrderLineId,positiveDecimal(line.confirmedQuantity,'confirmedQuantity'),line.confirmedDate||null,line.note?.trim()??''],
        );
      }
      const updated = await client.query<any>(`UPDATE procurement.purchase_orders SET status='CONFIRMED',confirmed_at=now(),version=version+1,updated_by=$2,updated_at=now() WHERE id=$1 RETURNING *`,[poId,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'procurement.po_confirmed',targetType:'procurement.purchase_order',targetId:poId,metadata:{confirmationId:confirmation.rows[0]!.id}},client);
      return updated.rows[0];
    });
  }

  async recordReceipt(actor: AuthContext, poId: string, input: { kind: 'PHYSICAL_RECEIPT'|'FACTORY_COMMITMENT'; reference?: string; occurredOn: string; note?: string; lines: Array<{ purchaseOrderLineId:string; quantity:string|number; unit?:string; note?:string }> }): Promise<any> {
    requireCapability(actor, ProcurementCapability.Receive);
    if (!['PHYSICAL_RECEIPT','FACTORY_COMMITMENT'].includes(input.kind)) throw new ProcurementValidationError('Invalid receipt kind');
    if (!input.occurredOn) throw new ProcurementValidationError('occurredOn is required');
    if (!Array.isArray(input.lines) || input.lines.length < 1) throw new ProcurementValidationError('At least one receipt/commitment line is required');
    return this.database.transaction(async (client) => {
      const po = await client.query<any>('SELECT id,status FROM procurement.purchase_orders WHERE id=$1 FOR UPDATE',[poId]);
      if (!po.rows[0]) throw new ProcurementNotFoundError('Purchase order not found');
      if (!['CONFIRMED','PARTIALLY_FULFILLED'].includes(po.rows[0].status)) throw new ProcurementConflictError('Receipt/commitment requires a confirmed PO');
      const receipt = await client.query<{id:string}>(
        `INSERT INTO procurement.receipts(purchase_order_id,kind,reference,occurred_on,note,recorded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [poId,input.kind,input.reference?.trim()||null,input.occurredOn,input.note?.trim()??'',actor.userId],
      );
      for (const line of input.lines) await client.query(
        `INSERT INTO procurement.receipt_lines(receipt_id,purchase_order_line_id,quantity,unit,note) VALUES ($1,$2,$3,$4,$5)`,
        [receipt.rows[0]!.id,line.purchaseOrderLineId,positiveDecimal(line.quantity,'quantity'),normalizeUnit(line.unit),line.note?.trim()??''],
      );

      if (input.kind === 'PHYSICAL_RECEIPT') {
        const fulfillment = await client.query<{total_lines:number; fulfilled_lines:number; received_lines:number}>(
          `SELECT count(*)::int AS total_lines,
                  count(*) FILTER (WHERE COALESCE(r.received,0) >= l.ordered_quantity)::int AS fulfilled_lines,
                  count(*) FILTER (WHERE COALESCE(r.received,0) > 0)::int AS received_lines
           FROM procurement.purchase_order_lines l
           LEFT JOIN LATERAL (
             SELECT sum(rl.quantity) AS received
             FROM procurement.receipt_lines rl JOIN procurement.receipts rh ON rh.id=rl.receipt_id
             WHERE rl.purchase_order_line_id=l.id AND rh.kind='PHYSICAL_RECEIPT'
           ) r ON true WHERE l.purchase_order_id=$1`,[poId],
        );
        const f=fulfillment.rows[0]!;
        const nextStatus:PurchaseOrderStatus = f.total_lines>0 && f.fulfilled_lines===f.total_lines ? 'FULFILLED' : f.received_lines>0 ? 'PARTIALLY_FULFILLED' : po.rows[0].status;
        if (nextStatus!==po.rows[0].status) await client.query(`UPDATE procurement.purchase_orders SET status=$2,version=version+1,updated_by=$3,updated_at=now() WHERE id=$1`,[poId,nextStatus,actor.userId]);
      }
      await this.audit.record({actorUserId:actor.userId,action:input.kind==='PHYSICAL_RECEIPT'?'procurement.receipt_recorded':'procurement.factory_commitment_recorded',targetType:'procurement.purchase_order',targetId:poId,metadata:{receiptId:receipt.rows[0]!.id}},client);
      return {id:receipt.rows[0]!.id};
    });
  }
}
