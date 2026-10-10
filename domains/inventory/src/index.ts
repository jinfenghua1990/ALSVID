import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const InventoryCapability = {
  Read: 'inventory.read',
  Move: 'inventory.move',
  Reserve: 'inventory.reserve',
  Stocktake: 'inventory.stocktake',
  Adjust: 'inventory.adjust',
} as const;

export type InventoryItemKind = 'PART' | 'SKU' | 'VEHICLE';
export type InventoryMovementType = 'RECEIPT' | 'TRANSFER' | 'ISSUE' | 'RETURN' | 'ADJUSTMENT' | 'STOCKTAKE_CORRECTION';

export class InventoryValidationError extends Error {}
export class InventoryNotFoundError extends Error {}
export class InventoryConflictError extends Error {}

export interface InventoryItemInput {
  itemKind: InventoryItemKind;
  itemId: string;
  unit: string;
}

export interface MovementInput extends InventoryItemInput {
  movementType: InventoryMovementType;
  quantity: string | number;
  sourceLocationId?: string;
  destinationLocationId?: string;
  reservationId?: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  idempotencyKey: string;
  correlationId?: string;
}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

function isZeroDecimal(text: string): boolean {
  return /^-?0+(?:\.0+)?$/.test(text);
}

function decimal(value: string | number, name: string): string {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text) || isZeroDecimal(text)) throw new InventoryValidationError(`${name} must be a positive decimal`);
  return text;
}

function signedDecimal(value: string | number, name: string): string {
  const text = String(value).trim();
  if (!/^-?\d+(?:\.\d{1,6})?$/.test(text) || isZeroDecimal(text)) throw new InventoryValidationError(`${name} must be a non-zero decimal`);
  return text;
}

function normalizeUnit(value: string): string {
  const unit = value.trim().toUpperCase();
  if (!unit || unit.length > 16) throw new InventoryValidationError('unit is required');
  return unit;
}

function itemIds(input: InventoryItemInput): { partId: string | null; skuId: string | null; vehicleId: string | null } {
  if (!input.itemId) throw new InventoryValidationError('itemId is required');
  if (input.itemKind === 'PART') return { partId: input.itemId, skuId: null, vehicleId: null };
  if (input.itemKind === 'SKU') return { partId: null, skuId: input.itemId, vehicleId: null };
  if (input.itemKind === 'VEHICLE') return { partId: null, skuId: null, vehicleId: input.itemId };
  throw new InventoryValidationError('itemKind must be PART, SKU or VEHICLE');
}

export class InventoryService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async summary(actor: AuthContext): Promise<any> {
    requireCapability(actor, InventoryCapability.Read);
    const [balances, movements, reservations] = await Promise.all([
      this.database.query<any>(`SELECT a.*, l.code AS location_code, l.name AS location_name, w.code AS warehouse_code, w.name AS warehouse_name,
        p.part_number, p.name AS part_name, s.sku, s.name AS sku_name, v.frame_number
        FROM inventory.v_availability a
        JOIN warehouse.locations l ON l.id=a.location_id
        JOIN warehouse.warehouses w ON w.id=l.warehouse_id
        LEFT JOIN engineering.parts p ON p.id=a.part_id
        LEFT JOIN product.skus s ON s.id=a.sku_id
        LEFT JOIN vehicle.vehicles v ON v.id=a.vehicle_id
        ORDER BY w.code,l.code,a.item_kind,COALESCE(p.part_number,s.sku,v.frame_number)`),
      this.database.query<any>(`SELECT m.*, sl.code AS source_location_code, sw.code AS source_warehouse_code,
        dl.code AS destination_location_code, dw.code AS destination_warehouse_code,
        p.part_number, s.sku, v.frame_number
        FROM inventory.movements m
        LEFT JOIN warehouse.locations sl ON sl.id=m.source_location_id LEFT JOIN warehouse.warehouses sw ON sw.id=sl.warehouse_id
        LEFT JOIN warehouse.locations dl ON dl.id=m.destination_location_id LEFT JOIN warehouse.warehouses dw ON dw.id=dl.warehouse_id
        LEFT JOIN engineering.parts p ON p.id=m.part_id LEFT JOIN product.skus s ON s.id=m.sku_id LEFT JOIN vehicle.vehicles v ON v.id=m.vehicle_id
        ORDER BY m.occurred_at DESC LIMIT 500`),
      this.database.query<any>(`SELECT r.*, l.code AS location_code, w.code AS warehouse_code, p.part_number, s.sku, v.frame_number
        FROM inventory.reservations r JOIN warehouse.locations l ON l.id=r.location_id JOIN warehouse.warehouses w ON w.id=l.warehouse_id
        LEFT JOIN engineering.parts p ON p.id=r.part_id LEFT JOIN product.skus s ON s.id=r.sku_id LEFT JOIN vehicle.vehicles v ON v.id=r.vehicle_id
        ORDER BY r.created_at DESC LIMIT 500`),
    ]);
    return { balances: balances.rows, movements: movements.rows, reservations: reservations.rows };
  }

  async postMovement(actor: AuthContext, input: MovementInput): Promise<any> {
    if (input.movementType === 'ADJUSTMENT') {
      requireCapability(actor, InventoryCapability.Adjust);
      if (!input.reason?.trim()) throw new InventoryValidationError('Adjustment reason is required');
    } else if (input.movementType === 'STOCKTAKE_CORRECTION') requireCapability(actor, InventoryCapability.Stocktake);
    else requireCapability(actor, InventoryCapability.Move);
    return this.insertMovement(actor, input, this.database);
  }

  async createReservation(actor: AuthContext, input: InventoryItemInput & { locationId: string; quantity: string | number; referenceType?: string; referenceId?: string; note?: string }): Promise<any> {
    requireCapability(actor, InventoryCapability.Reserve);
    const unit = normalizeUnit(input.unit);
    await this.assertItem(input.itemKind, input.itemId, unit, this.database);
    const ids = itemIds(input);
    try {
      const result = await this.database.query<any>(
        `INSERT INTO inventory.reservations(item_kind,part_id,sku_id,vehicle_id,location_id,quantity,unit,reference_type,reference_id,note,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
        [input.itemKind,ids.partId,ids.skuId,ids.vehicleId,input.locationId,decimal(input.quantity,'quantity'),unit,input.referenceType?.trim()||null,input.referenceId||null,input.note?.trim()??'',actor.userId],
      );
      await this.audit.record({ actorUserId: actor.userId, action: 'inventory.reservation_created', targetType: 'inventory.reservation', targetId: result.rows[0].id }, this.database);
      return result.rows[0];
    } catch (error: any) {
      this.rethrowDatabaseError(error);
    }
  }

  async releaseReservation(actor: AuthContext, reservationId: string): Promise<any> {
    requireCapability(actor, InventoryCapability.Reserve);
    const result = await this.database.query<any>(
      `UPDATE inventory.reservations SET status='RELEASED',released_at=now(),updated_at=now(),updated_by=$2,version=version+1
       WHERE id=$1 AND status='ACTIVE' RETURNING *`,[reservationId,actor.userId]);
    if (!result.rows[0]) throw new InventoryConflictError('Reservation is missing or no longer active');
    await this.audit.record({ actorUserId:actor.userId, action:'inventory.reservation_released', targetType:'inventory.reservation', targetId:reservationId });
    return result.rows[0];
  }

  async issueReservation(actor: AuthContext, reservationId: string, input: { idempotencyKey: string; reason?: string; referenceType?: string; referenceId?: string }): Promise<any> {
    requireCapability(actor, InventoryCapability.Move);
    requireCapability(actor, InventoryCapability.Reserve);
    return this.database.transaction(async (client) => {
      const row = await client.query<any>(`SELECT * FROM inventory.reservations WHERE id=$1 AND status='ACTIVE' FOR UPDATE`,[reservationId]);
      const reservation = row.rows[0];
      if (!reservation) throw new InventoryConflictError('Reservation is missing or no longer active');
      const itemId = reservation.part_id ?? reservation.sku_id ?? reservation.vehicle_id;
      return this.insertMovement(actor, {
        movementType:'ISSUE', itemKind:reservation.item_kind, itemId, unit:reservation.unit, quantity:reservation.quantity,
        sourceLocationId:reservation.location_id, reservationId, idempotencyKey:input.idempotencyKey,
        reason:input.reason, referenceType:input.referenceType ?? reservation.reference_type, referenceId:input.referenceId ?? reservation.reference_id,
      }, client);
    });
  }

  async balanceAt(input: InventoryItemInput & { locationId: string }, executor: QueryExecutor = this.database): Promise<string> {
    const unit = normalizeUnit(input.unit);
    const ids = itemIds(input);
    const result = await executor.query<{ on_hand: string }>(
      `SELECT COALESCE(sum(on_hand),0)::text AS on_hand FROM inventory.v_location_balances
       WHERE item_kind=$1 AND part_id IS NOT DISTINCT FROM $2 AND sku_id IS NOT DISTINCT FROM $3 AND vehicle_id IS NOT DISTINCT FROM $4
         AND location_id=$5 AND upper(unit)=upper($6)`,
      [input.itemKind,ids.partId,ids.skuId,ids.vehicleId,input.locationId,unit],
    );
    return result.rows[0]?.on_hand ?? '0';
  }

  async postStocktakeCorrection(actor: AuthContext, input: InventoryItemInput & { locationId:string; delta:string|number; stocktakeId:string; countId:string }, executor: QueryExecutor): Promise<any> {
    requireCapability(actor, InventoryCapability.Stocktake);
    const delta = signedDecimal(input.delta,'delta');
    const inbound = !delta.startsWith('-');
    const quantity = inbound ? delta : delta.slice(1);
    return this.insertMovement(actor, {
      movementType:'STOCKTAKE_CORRECTION', itemKind:input.itemKind, itemId:input.itemId, unit:input.unit,
      quantity, sourceLocationId:inbound?undefined:input.locationId,
      destinationLocationId:inbound?input.locationId:undefined, referenceType:'STOCKTAKE', referenceId:input.stocktakeId,
      reason:'Stocktake reconciliation', idempotencyKey:`stocktake:${input.stocktakeId}:${input.countId}`,
      correlationId:input.stocktakeId,
    }, executor);
  }

  private async insertMovement(actor: AuthContext, input: MovementInput, executor: QueryExecutor): Promise<any> {
    const unit = normalizeUnit(input.unit);
    await this.assertItem(input.itemKind,input.itemId,unit,executor);
    const ids = itemIds(input);
    if (!input.idempotencyKey?.trim()) throw new InventoryValidationError('idempotencyKey is required');
    try {
      const result = await executor.query<any>(
        `INSERT INTO inventory.movements(movement_type,item_kind,part_id,sku_id,vehicle_id,quantity,unit,source_location_id,destination_location_id,reservation_id,reference_type,reference_id,reason,idempotency_key,correlation_id,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [input.movementType,input.itemKind,ids.partId,ids.skuId,ids.vehicleId,decimal(input.quantity,'quantity'),unit,input.sourceLocationId||null,input.destinationLocationId||null,input.reservationId||null,input.referenceType?.trim()||null,input.referenceId||null,input.reason?.trim()??'',input.idempotencyKey.trim(),input.correlationId?.trim()||null,actor.userId],
      );
      await this.audit.record({ actorUserId:actor.userId, action:'inventory.movement_posted', targetType:'inventory.movement', targetId:result.rows[0].id, correlationId:input.correlationId, metadata:{ movementType:input.movementType, itemKind:input.itemKind } }, executor);
      return result.rows[0];
    } catch (error:any) {
      this.rethrowDatabaseError(error);
    }
  }

  private async assertItem(kind: InventoryItemKind, id: string, unit: string, executor: QueryExecutor): Promise<void> {
    if (kind === 'PART') {
      const result = await executor.query<{ unit:string }>(`SELECT default_unit AS unit FROM engineering.parts WHERE id=$1`,[id]);
      if (!result.rows[0]) throw new InventoryNotFoundError('Part not found');
      if (result.rows[0].unit.trim().toUpperCase() !== unit) throw new InventoryValidationError(`Part unit must be ${result.rows[0].unit}`);
      return;
    }
    if (kind === 'SKU') {
      const result = await executor.query(`SELECT 1 FROM product.skus WHERE id=$1`,[id]);
      if (!result.rows[0]) throw new InventoryNotFoundError('SKU not found');
      if (unit !== 'EA') throw new InventoryValidationError('SKU inventory unit must be EA');
      return;
    }
    if (kind === 'VEHICLE') {
      const result = await executor.query(`SELECT 1 FROM vehicle.vehicles WHERE id=$1`,[id]);
      if (!result.rows[0]) throw new InventoryNotFoundError('Vehicle not found');
      if (unit !== 'EA') throw new InventoryValidationError('Vehicle inventory unit must be EA');
      return;
    }
    throw new InventoryValidationError('Unsupported item kind');
  }

  private rethrowDatabaseError(error:any): never {
    const message=String(error?.message??'');
    if (error?.code==='23503') throw new InventoryNotFoundError('Referenced inventory entity or location not found');
    if (error?.code==='23505') throw new InventoryConflictError(message.includes('idempotency')?'Duplicate inventory idempotency key':'Inventory record already exists');
    if (error?.code==='23514') throw new InventoryValidationError(message);
    if (/negative stock|reserved stock|already present|source location|Insufficient available stock|active reservation|Reservation baseline|Invalid reservation/i.test(message)) throw new InventoryConflictError(message);
    if (/requires|must be|itemKind|unit/i.test(message)) throw new InventoryValidationError(message);
    throw error;
  }
}
