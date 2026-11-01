import type{DatabasePort,QueryExecutor}from'@alsvid/database';import type{VehicleRepository}from'../application/ports.js';
export class PostgresVehicleRepository implements VehicleRepository{constructor(private readonly db:DatabasePort){}transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>{return this.db.transaction(work)}
 async list():Promise<any[]>{const r=await this.db.query<any>(`SELECT v.*,po.production_order_number,bs.code AS build_spec_code,s.sku,s.product_id::text AS product_id,s.sku_number::text AS sku_number,p.display_name AS factory_name,u.unit_no FROM vehicle.vehicles v JOIN production.production_units u ON u.id=v.production_unit_id JOIN production.production_orders po ON po.id=v.production_order_id JOIN engineering.build_specs bs ON bs.id=v.build_spec_id JOIN product.skus s ON s.id=v.sku_id JOIN partners.partners p ON p.id=v.factory_partner_id ORDER BY v.born_at DESC LIMIT 1000`);return r.rows}
 async get(id:string):Promise<any|null>{
  // Targeted primary-key lookup; do not fetch the last 1000 vehicles for a link.
  const r=await this.db.query<any>(
   `SELECT v.*,po.production_order_number,bs.code AS build_spec_code,s.sku,s.product_id::text AS product_id,s.sku_number::text AS sku_number,p.display_name AS factory_name,u.unit_no
   FROM vehicle.vehicles v
   JOIN production.production_units u ON u.id=v.production_unit_id
   JOIN production.production_orders po ON po.id=v.production_order_id
   JOIN engineering.build_specs bs ON bs.id=v.build_spec_id
   JOIN product.skus s ON s.id=v.sku_id
   JOIN partners.partners p ON p.id=v.factory_partner_id
   WHERE v.id=$1 LIMIT 1`,[id]);
  return r.rows[0]??null;
 }
 async listOwned(userId:string):Promise<any[]> {
  // Latest immutable event is authoritative. Never infer ownership from email or VIN.
  const r=await this.db.query<any>(`SELECT v.id,v.vehicle_code,v.frame_number,v.born_at,s.sku,s.product_id::text AS product_id,s.sku_number::text AS sku_number
   FROM vehicle.vehicles v JOIN product.skus s ON s.id=v.sku_id
   JOIN LATERAL (SELECT event_kind,customer_user_id FROM vehicle.owner_access_events
     WHERE vehicle_id=v.id ORDER BY event_no DESC LIMIT 1) owner ON true
   JOIN identity.users u ON u.id=owner.customer_user_id AND u.status='ACTIVE'
   WHERE owner.event_kind='GRANTED' AND owner.customer_user_id=$1
     AND EXISTS(SELECT 1 FROM identity.user_roles ur WHERE ur.user_id=u.id AND ur.role_id='customer_user')
   ORDER BY v.born_at DESC LIMIT 100`,[userId]);
  return r.rows;
 }
 async getOwned(userId:string,vehicleId:string):Promise<any|null>{
  const r=await this.db.query<any>(`SELECT v.id,v.vehicle_code,v.frame_number,v.born_at,s.sku,s.product_id::text AS product_id,s.sku_number::text AS sku_number
   FROM vehicle.vehicles v JOIN product.skus s ON s.id=v.sku_id
   JOIN LATERAL (SELECT event_kind,customer_user_id FROM vehicle.owner_access_events
      WHERE vehicle_id=v.id ORDER BY event_no DESC LIMIT 1) owner ON true
   JOIN identity.users u ON u.id=owner.customer_user_id AND u.status='ACTIVE'
   WHERE v.id=$2 AND owner.event_kind='GRANTED' AND owner.customer_user_id=$1
     AND EXISTS(SELECT 1 FROM identity.user_roles ur WHERE ur.user_id=u.id AND ur.role_id='customer_user')
   LIMIT 1`,[userId,vehicleId]);
  return r.rows[0]??null;
 }
 async lockForOwnerChange(id:string,e:QueryExecutor):Promise<boolean>{
  const r=await e.query('SELECT id FROM vehicle.vehicles WHERE id=$1 FOR UPDATE',[id]);return r.rowCount===1;
 }
 async latestOwner(vehicleId:string,e:QueryExecutor):Promise<{customerUserId:string;kind:string}|null>{
  const r=await e.query<{customer_user_id:string;event_kind:string}>(`SELECT customer_user_id,event_kind
   FROM vehicle.owner_access_events WHERE vehicle_id=$1 ORDER BY event_no DESC LIMIT 1`,[vehicleId]);
  const row=r.rows[0];return row?{customerUserId:row.customer_user_id,kind:row.event_kind}:null;
 }
 async eligibleOwner(userId:string,e:QueryExecutor):Promise<boolean>{
  const r=await e.query(`SELECT id FROM identity.users u WHERE id=$1 AND status='ACTIVE'
    AND email_verified_at IS NOT NULL
    AND EXISTS(SELECT 1 FROM identity.user_roles ur WHERE ur.user_id=u.id AND ur.role_id='customer_user')`,[userId]);
  return r.rowCount===1;
 }
 async recordOwnerEvent(vehicleId:string,userId:string,kind:'GRANTED'|'REVOKED',evidenceRef:string,actorId:string,e:QueryExecutor):Promise<void>{
  await e.query(`INSERT INTO vehicle.owner_access_events(vehicle_id,customer_user_id,event_kind,evidence_ref,performed_by)
    VALUES($1,$2,$3,$4,$5)`,[vehicleId,userId,kind,evidenceRef,actorId]);
 }
 async lockBirthCandidate(id:string,e:QueryExecutor):Promise<any|null>{const r=await e.query<any>(`SELECT u.id,u.status,u.production_order_id,po.build_spec_id,po.factory_partner_id,bs.sku_id FROM production.production_units u JOIN production.production_orders po ON po.id=u.production_order_id JOIN engineering.build_specs bs ON bs.id=po.build_spec_id WHERE u.id=$1 FOR UPDATE OF u`,[id]);return r.rows[0]??null}
 async latestQc(id:string,e:QueryExecutor):Promise<any|null>{const r=await e.query<any>(`SELECT id,result FROM production.qc_inspections WHERE production_unit_id=$1 ORDER BY inspected_at DESC,id DESC LIMIT 1`,[id]);return r.rows[0]??null}
 async createVehicle(input:{frameNumber:string;unitId:string;productionOrderId:string;buildSpecId:string;skuId:string;factoryPartnerId:string;birthQcInspectionId:string;actorUserId:string},e:QueryExecutor):Promise<any>{const r=await e.query<any>(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[input.frameNumber,input.unitId,input.productionOrderId,input.buildSpecId,input.skuId,input.factoryPartnerId,input.birthQcInspectionId,input.actorUserId]);return r.rows[0]}
}
