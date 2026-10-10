import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';
import { InventoryConflictError, createInventoryService } from './index.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const suffix=()=>randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
const audit={async record():Promise<void>{}};
type TestActor={userId:string;permissions:string[]};

async function actor(db:Database):Promise<TestActor>{
  const email=`inventory-${suffix().toLowerCase()}@example.com`;
  const user=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Inventory Test','x') RETURNING id`,[email]);
  return{userId:user.rows[0]!.id,permissions:['inventory.read','inventory.move','inventory.reserve','inventory.stocktake','inventory.adjust','warehouse.manage']};
}

async function warehouse(db:Database,userId:string):Promise<{warehouseId:string;locationA:string;locationB:string}>{
  const key=suffix();
  const w=await db.query<{id:string}>(`INSERT INTO warehouse.warehouses(code,name,country_code,created_by,updated_by) VALUES ($1,$2,'DE',$3,$3) RETURNING id`,[`W${key}`,`Warehouse ${key}`,userId]);
  const a=await db.query<{id:string}>(`INSERT INTO warehouse.locations(warehouse_id,code,name,location_type,created_by,updated_by) VALUES ($1,'A','A','STORAGE',$2,$2) RETURNING id`,[w.rows[0]!.id,userId]);
  const b=await db.query<{id:string}>(`INSERT INTO warehouse.locations(warehouse_id,code,name,location_type,created_by,updated_by) VALUES ($1,'B','B','STORAGE',$2,$2) RETURNING id`,[w.rows[0]!.id,userId]);
  return{warehouseId:w.rows[0]!.id,locationA:a.rows[0]!.id,locationB:b.rows[0]!.id};
}

async function part(db:Database):Promise<string>{
  const row=await db.query<{id:string}>(`INSERT INTO engineering.parts(part_number,name,default_unit) VALUES ($1,'Inventory Part','EA') RETURNING id`,[`P-${suffix()}`]);
  return row.rows[0]!.id;
}

async function vehicle(db:Database,userId:string):Promise<string>{
  const key=suffix();
  const factory=await db.query<{id:string}>(`INSERT INTO partners.partners(kind,display_name) VALUES ('ORGANIZATION',$1) RETURNING id`,[`Factory ${key}`]);
  await db.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,'FACTORY')`,[factory.rows[0]!.id]);
  const platform=await db.query<{id:string}>(`SELECT id FROM product.platforms WHERE code='FC'`);
  const model=await db.query<{id:string}>(`INSERT INTO product.models(platform_id,code,name) VALUES ($1,$2,'Inventory Vehicle') RETURNING id`,[platform.rows[0]!.id,`M${key}`]);
  const variant=await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name) VALUES ($1,'BASE','Base') RETURNING id`,[model.rows[0]!.id]);
  const sku=await db.query<{id:string}>(`INSERT INTO product.skus(variant_id,sku,name) VALUES ($1,$2,'Inventory Vehicle SKU') RETURNING id`,[variant.rows[0]!.id,`S${key}`]);
  const bom=await db.query<{id:string}>(`INSERT INTO engineering.boms(model_id,code,name) VALUES ($1,$2,'Inventory Vehicle BOM') RETURNING id`,[model.rows[0]!.id,`B${key}`]);
  const rev=await db.query<{id:string}>(`INSERT INTO engineering.bom_revisions(bom_id,revision_code,status,released_at) VALUES ($1,'A','RELEASED',now()) RETURNING id`,[bom.rows[0]!.id]);
  const spec=await db.query<{id:string}>(`INSERT INTO engineering.build_specs(code,sku_id,bom_revision_id,status,released_at) VALUES ($1,$2,$3,'RELEASED',now()) RETURNING id`,[`BS${key}`,sku.rows[0]!.id,rev.rows[0]!.id]);
  const order=await db.query<{id:string}>(`INSERT INTO production.production_orders(build_spec_id,factory_partner_id,planned_quantity,status,released_at) VALUES ($1,$2,1,'RELEASED',now()) RETURNING id`,[spec.rows[0]!.id,factory.rows[0]!.id]);
  const unit=await db.query<{id:string}>(`INSERT INTO production.production_units(production_order_id,unit_no,status) VALUES ($1,1,'QC_PENDING') RETURNING id`,[order.rows[0]!.id]);
  const qc=await db.query<{id:string}>(`INSERT INTO production.qc_inspections(production_unit_id,result,inspected_by) VALUES ($1,'PASS',$2) RETURNING id`,[unit.rows[0]!.id,userId]);
  await db.query(`UPDATE production.production_units SET status='QC_PASSED' WHERE id=$1`,[unit.rows[0]!.id]);
  const result=await db.query<{id:string}>(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[`FRAME-${key}`,unit.rows[0]!.id,order.rows[0]!.id,spec.rows[0]!.id,sku.rows[0]!.id,factory.rows[0]!.id,qc.rows[0]!.id,userId]);
  return result.rows[0]!.id;
}

test('movement ledger derives balances, is immutable/idempotent, and protects reservations', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=createInventoryService(db,audit);const places=await warehouse(db,auth.userId);const partId=await part(db);
    const receipt=await service.postMovement(auth,{movementType:'RECEIPT',itemKind:'PART',itemId:partId,unit:'EA',quantity:'10',destinationLocationId:places.locationA,idempotencyKey:`receipt-${suffix()}`});
    await service.postMovement(auth,{movementType:'TRANSFER',itemKind:'PART',itemId:partId,unit:'EA',quantity:'4',sourceLocationId:places.locationA,destinationLocationId:places.locationB,idempotencyKey:`transfer-${suffix()}`});
    assert.equal(Number(await service.balanceAt({itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationA})),6);
    assert.equal(Number(await service.balanceAt({itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationB})),4);
    await assert.rejects(db.query(`UPDATE inventory.movements SET reason='mutated' WHERE id=$1`,[receipt.id]),/append-only/);
    await assert.rejects(service.postMovement(auth,{movementType:'RECEIPT',itemKind:'PART',itemId:partId,unit:'EA',quantity:'1',destinationLocationId:places.locationA,idempotencyKey:receipt.idempotency_key}),InventoryConflictError);
    const reservation=await service.createReservation(auth,{itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationA,quantity:'5',referenceType:'TEST'});
    await assert.rejects(service.postMovement(auth,{movementType:'ISSUE',itemKind:'PART',itemId:partId,unit:'EA',quantity:'2',sourceLocationId:places.locationA,idempotencyKey:`issue-${suffix()}`}),InventoryConflictError);
    await service.issueReservation(auth,reservation.id,{idempotencyKey:`reserved-issue-${suffix()}`});
    assert.equal(Number(await service.balanceAt({itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationA})),1);
    const state=await db.query<{status:string}>(`SELECT status FROM inventory.reservations WHERE id=$1`,[reservation.id]);
    assert.equal(state.rows[0]!.status,'CONSUMED');
    await assert.rejects(service.postMovement(auth,{movementType:'ISSUE',itemKind:'PART',itemId:partId,unit:'EA',quantity:'2',sourceLocationId:places.locationA,idempotencyKey:`negative-${suffix()}`}),InventoryConflictError);
  }finally{await db.close();}
});

test('serialized Vehicle can occupy only one inventory location and must move from its current location', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=createInventoryService(db,audit);const places=await warehouse(db,auth.userId);const vehicleId=await vehicle(db,auth.userId);
    await service.postMovement(auth,{movementType:'RECEIPT',itemKind:'VEHICLE',itemId:vehicleId,unit:'EA',quantity:'1',destinationLocationId:places.locationA,idempotencyKey:`vehicle-receipt-${suffix()}`});
    await assert.rejects(service.postMovement(auth,{movementType:'RECEIPT',itemKind:'VEHICLE',itemId:vehicleId,unit:'EA',quantity:'1',destinationLocationId:places.locationB,idempotencyKey:`vehicle-double-${suffix()}`}),InventoryConflictError);
    await service.postMovement(auth,{movementType:'TRANSFER',itemKind:'VEHICLE',itemId:vehicleId,unit:'EA',quantity:'1',sourceLocationId:places.locationA,destinationLocationId:places.locationB,idempotencyKey:`vehicle-transfer-${suffix()}`});
    assert.equal(Number(await service.balanceAt({itemKind:'VEHICLE',itemId:vehicleId,unit:'EA',locationId:places.locationA})),0);
    assert.equal(Number(await service.balanceAt({itemKind:'VEHICLE',itemId:vehicleId,unit:'EA',locationId:places.locationB})),1);
    await assert.rejects(service.postMovement(auth,{movementType:'ISSUE',itemKind:'VEHICLE',itemId:vehicleId,unit:'EA',quantity:'1',sourceLocationId:places.locationA,idempotencyKey:`vehicle-wrong-source-${suffix()}`}),InventoryConflictError);
  }finally{await db.close();}
});

test('concurrent issues and reservations serialize on the inventory position', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=createInventoryService(db,audit);const places=await warehouse(db,auth.userId);const partId=await part(db);
    await service.postMovement(auth,{movementType:'RECEIPT',itemKind:'PART',itemId:partId,unit:'EA',quantity:'1',destinationLocationId:places.locationA,idempotencyKey:`concurrent-receipt-${suffix()}`});
    const issues=await Promise.allSettled([
      service.postMovement(auth,{movementType:'ISSUE',itemKind:'PART',itemId:partId,unit:'EA',quantity:'1',sourceLocationId:places.locationA,idempotencyKey:`concurrent-issue-a-${suffix()}`}),
      service.postMovement(auth,{movementType:'ISSUE',itemKind:'PART',itemId:partId,unit:'EA',quantity:'1',sourceLocationId:places.locationA,idempotencyKey:`concurrent-issue-b-${suffix()}`}),
    ]);
    assert.equal(issues.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(issues.filter(result=>result.status==='rejected').length,1);
    assert.equal(Number(await service.balanceAt({itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationA})),0);

    await service.postMovement(auth,{movementType:'RECEIPT',itemKind:'PART',itemId:partId,unit:'EA',quantity:'1',destinationLocationId:places.locationA,idempotencyKey:`concurrent-replenish-${suffix()}`});
    const reservations=await Promise.allSettled([
      service.createReservation(auth,{itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationA,quantity:'1',referenceType:'CONCURRENT-A'}),
      service.createReservation(auth,{itemKind:'PART',itemId:partId,unit:'EA',locationId:places.locationA,quantity:'1',referenceType:'CONCURRENT-B'}),
    ]);
    assert.equal(reservations.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(reservations.filter(result=>result.status==='rejected').length,1);
    const active=await db.query<{count:number}>(`SELECT count(*)::int AS count FROM inventory.reservations WHERE status='ACTIVE' AND part_id=$1 AND location_id=$2`,[partId,places.locationA]);
    assert.equal(active.rows[0]!.count,1);
  }finally{await db.close();}
});
