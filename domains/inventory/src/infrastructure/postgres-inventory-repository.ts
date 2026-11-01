import type{DatabasePort,QueryExecutor}from'@alsvid/database';import type{InventoryItemIds,InventoryItemKind,MovementInput,ReservationInput}from'../core/model.js';import type{InventoryRepository}from'../application/ports.js';
export class PostgresInventoryRepository implements InventoryRepository{constructor(private readonly db:DatabasePort){}private exec(e?:QueryExecutor):QueryExecutor{return e??this.db}transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>{return this.db.transaction(work)}
 async summary():Promise<any>{
  const[balances,movements,reservations]=await Promise.all([
   this.db.query<any>(`SELECT a.*,l.code AS location_code,l.name AS location_name,
    w.code AS warehouse_code,w.name AS warehouse_name,p.part_number,p.name AS part_name,
    s.sku,s.sku_number::text AS sku_number,s.product_id::text AS product_id,
    s.name AS sku_name,v.frame_number
    FROM inventory.v_availability a
    JOIN warehouse.locations l ON l.id=a.location_id
    JOIN warehouse.warehouses w ON w.id=l.warehouse_id
    LEFT JOIN engineering.parts p ON p.id=a.part_id
    LEFT JOIN product.skus s ON s.id=a.sku_id
    LEFT JOIN vehicle.vehicles v ON v.id=a.vehicle_id
    ORDER BY w.code,l.code,a.item_kind,COALESCE(p.part_number,s.sku,v.frame_number)`),
   this.db.query<any>(`SELECT m.*,sl.code AS source_location_code,sw.code AS source_warehouse_code,
    dl.code AS destination_location_code,dw.code AS destination_warehouse_code,p.part_number,
    s.sku,s.sku_number::text AS sku_number,s.product_id::text AS product_id,v.frame_number
    FROM inventory.movements m
    LEFT JOIN warehouse.locations sl ON sl.id=m.source_location_id
    LEFT JOIN warehouse.warehouses sw ON sw.id=sl.warehouse_id
    LEFT JOIN warehouse.locations dl ON dl.id=m.destination_location_id
    LEFT JOIN warehouse.warehouses dw ON dw.id=dl.warehouse_id
    LEFT JOIN engineering.parts p ON p.id=m.part_id
    LEFT JOIN product.skus s ON s.id=m.sku_id
    LEFT JOIN vehicle.vehicles v ON v.id=m.vehicle_id
    ORDER BY m.occurred_at DESC LIMIT 500`),
   this.db.query<any>(`SELECT r.*,l.code AS location_code,w.code AS warehouse_code,p.part_number,
    s.sku,s.sku_number::text AS sku_number,s.product_id::text AS product_id,v.frame_number
    FROM inventory.reservations r
    JOIN warehouse.locations l ON l.id=r.location_id
    JOIN warehouse.warehouses w ON w.id=l.warehouse_id
    LEFT JOIN engineering.parts p ON p.id=r.part_id
    LEFT JOIN product.skus s ON s.id=r.sku_id
    LEFT JOIN vehicle.vehicles v ON v.id=r.vehicle_id
    ORDER BY r.created_at DESC LIMIT 500`),
  ]);
  return{balances:balances.rows,movements:movements.rows,reservations:reservations.rows};
 }
 async itemUnit(kind:InventoryItemKind,id:string,e?:QueryExecutor):Promise<string|null>{const x=this.exec(e);if(kind==='PART'){const r=await x.query<{unit:string}>(`SELECT default_unit AS unit FROM engineering.parts WHERE id=$1`,[id]);return r.rows[0]?.unit??null}if(kind==='SKU'){const r=await x.query(`SELECT 1 FROM product.skus WHERE id=$1`,[id]);return r.rows[0]?'EA':null}if(kind==='VEHICLE'){const r=await x.query(`SELECT 1 FROM vehicle.vehicles WHERE id=$1`,[id]);return r.rows[0]?'EA':null}return null}
 async createReservation(input:ReservationInput&InventoryItemIds&{quantity:string;unit:string;actorUserId:string},e?:QueryExecutor):Promise<any>{const r=await this.exec(e).query<any>(`INSERT INTO inventory.reservations(item_kind,part_id,sku_id,vehicle_id,location_id,quantity,unit,reference_type,reference_id,note,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,[input.itemKind,input.partId,input.skuId,input.vehicleId,input.locationId,input.quantity,input.unit,input.referenceType?.trim()||null,input.referenceId||null,input.note?.trim()??'',input.actorUserId]);return r.rows[0]}
 async releaseReservation(id:string,userId:string,e?:QueryExecutor):Promise<any|null>{const r=await this.exec(e).query<any>(`UPDATE inventory.reservations SET status='RELEASED',released_at=now(),updated_at=now(),updated_by=$2,version=version+1 WHERE id=$1 AND status='ACTIVE' RETURNING *`,[id,userId]);return r.rows[0]??null}
 async lockReservation(id:string,e:QueryExecutor):Promise<any|null>{const r=await e.query<any>(`SELECT * FROM inventory.reservations WHERE id=$1 AND status='ACTIVE' FOR UPDATE`,[id]);return r.rows[0]??null}
 async insertMovement(input:MovementInput&InventoryItemIds&{quantity:string;unit:string;actorUserId:string},e?:QueryExecutor):Promise<any>{const r=await this.exec(e).query<any>(`INSERT INTO inventory.movements(movement_type,item_kind,part_id,sku_id,vehicle_id,quantity,unit,source_location_id,destination_location_id,reservation_id,reference_type,reference_id,reason,idempotency_key,correlation_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,[input.movementType,input.itemKind,input.partId,input.skuId,input.vehicleId,input.quantity,input.unit,input.sourceLocationId||null,input.destinationLocationId||null,input.reservationId||null,input.referenceType?.trim()||null,input.referenceId||null,input.reason?.trim()??'',input.idempotencyKey.trim(),input.correlationId?.trim()||null,input.actorUserId]);return r.rows[0]}
 async balanceAt(input:{itemKind:InventoryItemKind;ids:InventoryItemIds;locationId:string;unit:string},e?:QueryExecutor):Promise<string>{const r=await this.exec(e).query<{on_hand:string}>(`SELECT COALESCE(sum(on_hand),0)::text AS on_hand FROM inventory.v_location_balances WHERE item_kind=$1 AND part_id IS NOT DISTINCT FROM $2 AND sku_id IS NOT DISTINCT FROM $3 AND vehicle_id IS NOT DISTINCT FROM $4 AND location_id=$5 AND upper(unit)=upper($6)`,[input.itemKind,input.ids.partId,input.ids.skuId,input.ids.vehicleId,input.locationId,input.unit]);return r.rows[0]?.on_hand??'0'}
}
