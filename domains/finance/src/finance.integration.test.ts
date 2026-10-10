import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { AuditService } from '@alsvid/audit';
import { Database } from '@alsvid/database';
import type { AuthContext } from '@alsvid/identity';
import { FinanceConflictError, FinanceService } from './index.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const suffix=()=>randomUUID().replaceAll('-','').slice(0,10).toUpperCase();

async function actor(db:Database):Promise<AuthContext>{
  const email=`finance-${suffix().toLowerCase()}@example.com`;
  const row=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Finance Test','x') RETURNING id`,[email]);
  return{userId:row.rows[0]!.id,email,displayName:'Finance Test',roles:['finance_manager'],permissions:['finance.read','finance.document.write','finance.document.post','finance.payment.write','finance.allocate','finance.reconcile','finance.landed_cost']};
}

async function partner(db:Database,role?:'SUPPLIER'|'CUSTOMER'):Promise<string>{
  const row=await db.query<{id:string}>(`INSERT INTO partners.partners(kind,display_name,country_code) VALUES ('ORGANIZATION',$1,'DE') RETURNING id`,[`Finance Partner ${suffix()}`]);
  if(role)await db.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,$2)`,[row.rows[0]!.id,role]);
  return row.rows[0]!.id;
}

async function sku(db:Database):Promise<string>{
  const key=suffix();const platform=await db.query<{id:string}>(`SELECT id FROM product.platforms WHERE code='FC'`);
  const model=await db.query<{id:string}>(`INSERT INTO product.models(platform_id,code,name,status) VALUES ($1,$2,'Finance Model','ACTIVE') RETURNING id`,[platform.rows[0]!.id,`FM${key}`]);
  const variant=await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name,status) VALUES ($1,'BASE','Base','ACTIVE') RETURNING id`,[model.rows[0]!.id]);
  const row=await db.query<{id:string}>(`INSERT INTO product.skus(variant_id,sku,name,status) VALUES ($1,$2,'Finance SKU','ACTIVE') RETURNING id`,[variant.rows[0]!.id,`FSKU-${key}`]);
  return row.rows[0]!.id;
}

async function shipmentCargo(db:Database,userId:string):Promise<{shipmentId:string;cargoId:string}>{
  const key=suffix();
  const cnW=await db.query<{id:string}>(`INSERT INTO warehouse.warehouses(code,name,country_code,created_by,updated_by) VALUES ($1,'Finance CN','CN',$2,$2) RETURNING id`,[`CN${key}`,userId]);
  const deW=await db.query<{id:string}>(`INSERT INTO warehouse.warehouses(code,name,country_code,created_by,updated_by) VALUES ($1,'Finance DE','DE',$2,$2) RETURNING id`,[`DE${key}`,userId]);
  const cnL=await db.query<{id:string}>(`INSERT INTO warehouse.locations(warehouse_id,code,name,location_type,created_by,updated_by) VALUES ($1,'FG','Finished Goods','STORAGE',$2,$2) RETURNING id`,[cnW.rows[0]!.id,userId]);
  const deL=await db.query<{id:string}>(`INSERT INTO warehouse.locations(warehouse_id,code,name,location_type,created_by,updated_by) VALUES ($1,'RCV','Receiving','RECEIVING',$2,$2) RETURNING id`,[deW.rows[0]!.id,userId]);
  const skuId=await sku(db);
  const reservation=await db.query<{id:string}>(`INSERT INTO inventory.reservations(item_kind,sku_id,location_id,quantity,unit,reference_type,note,created_by,updated_by) VALUES ('SKU',$1,$2,1,'EA','TEST','Finance landed cost test',$3,$3) RETURNING id`,[skuId,cnL.rows[0]!.id,userId]);
  const shipment=await db.query<{id:string}>(`INSERT INTO logistics.shipments(route_type,origin_location_id,destination_location_id,created_by,updated_by) VALUES ('FACTORY_TO_GERMANY_WAREHOUSE',$1,$2,$3,$3) RETURNING id`,[cnL.rows[0]!.id,deL.rows[0]!.id,userId]);
  const cargo=await db.query<{id:string}>(`INSERT INTO logistics.shipment_cargo(shipment_id,item_kind,sku_id,quantity,unit,reservation_id,created_by) VALUES ($1,'SKU',$2,1,'EA',$3,$4) RETURNING id`,[shipment.rows[0]!.id,skuId,reservation.rows[0]!.id,userId]);
  return{shipmentId:shipment.rows[0]!.id,cargoId:cargo.rows[0]!.id};
}

test('posted invoice creates immutable AP obligation and allocations derive settlement state', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=new FinanceService(db,new AuditService(db));const supplier=await partner(db,'SUPPLIER');
    const document=await service.createDocument(auth,{documentType:'SUPPLIER_INVOICE',partnerId:supplier,externalReference:`INV-${suffix()}`,currency:'EUR',issueDate:'2026-10-10',dueDate:'2026-11-10',lines:[{category:'GOODS',netAmount:'1000',taxAmount:'190',description:'Bicycle goods'}]});
    assert.equal(Number(document.total_amount),1190);
    const verified=await service.verifyDocument(auth,document.id,document.version);const posted=await service.postDocument(auth,document.id,verified.version);assert.ok(posted.obligation);assert.equal(posted.obligation.direction,'AP');assert.equal(Number(posted.obligation.original_amount),1190);
    await assert.rejects(db.query(`UPDATE finance.documents SET note='mutated' WHERE id=$1`,[document.id]),/immutable/);

    const paymentA=await service.createPayment(auth,{direction:'OUTBOUND',partnerId:supplier,currency:'EUR',amount:'500',valueDate:'2026-10-15',idempotencyKey:`pay-${suffix()}`});
    await service.allocatePayment(auth,{paymentId:paymentA.id,obligationId:posted.obligation.id,paymentAmount:'500',obligationAmount:'500'});
    let obligation=await db.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`,[posted.obligation.id]);assert.equal(obligation.rows[0].settlement_status,'PARTIALLY_SETTLED');assert.equal(Number(obligation.rows[0].outstanding_amount),690);

    const paymentB=await service.createPayment(auth,{direction:'OUTBOUND',partnerId:supplier,currency:'EUR',amount:'690',valueDate:'2026-10-20',idempotencyKey:`pay-${suffix()}`});
    const allocationB=await service.allocatePayment(auth,{paymentId:paymentB.id,obligationId:posted.obligation.id,paymentAmount:'690',obligationAmount:'690'});
    obligation=await db.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`,[posted.obligation.id]);assert.equal(obligation.rows[0].settlement_status,'SETTLED');assert.equal(Number(obligation.rows[0].outstanding_amount),0);
    await assert.rejects(service.reversePayment(auth,paymentA.id,'wrong payment'),FinanceConflictError);
    await service.reverseAllocation(auth,allocationB.id,'Supplier refund / allocation correction');
    obligation=await db.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`,[posted.obligation.id]);assert.equal(Number(obligation.rows[0].outstanding_amount),690);
  }finally{await db.close();}
});

test('concurrent allocations cannot settle the same final obligation balance twice', {skip:!hasDatabase}, async()=>{
  const dbA=new Database();const dbB=new Database();
  try{
    const auth=await actor(dbA);const serviceA=new FinanceService(dbA,new AuditService(dbA));const serviceB=new FinanceService(dbB,new AuditService(dbB));const customer=await partner(dbA,'CUSTOMER');
    const obligation=await serviceA.createObligation(auth,{direction:'AR',partnerId:customer,currency:'EUR',amount:'100',dueDate:'2026-10-31'});
    const paymentA=await serviceA.createPayment(auth,{direction:'INBOUND',partnerId:customer,currency:'EUR',amount:'100',valueDate:'2026-10-12',idempotencyKey:`race-${suffix()}`});
    const paymentB=await serviceA.createPayment(auth,{direction:'INBOUND',partnerId:customer,currency:'EUR',amount:'100',valueDate:'2026-10-12',idempotencyKey:`race-${suffix()}`});
    const results=await Promise.allSettled([
      serviceA.allocatePayment(auth,{paymentId:paymentA.id,obligationId:obligation.id,paymentAmount:'100',obligationAmount:'100'}),
      serviceB.allocatePayment(auth,{paymentId:paymentB.id,obligationId:obligation.id,paymentAmount:'100',obligationAmount:'100'}),
    ]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected').length,1);
    const view=await dbA.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`,[obligation.id]);assert.equal(Number(view.rows[0].allocated_amount),100);assert.equal(view.rows[0].settlement_status,'SETTLED');
  }finally{await dbA.close();await dbB.close();}
});

test('cross-currency allocation requires explicit compatible FX evidence', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=new FinanceService(db,new AuditService(db));const customer=await partner(db,'CUSTOMER');
    const obligation=await service.createObligation(auth,{direction:'AR',partnerId:customer,currency:'EUR',amount:'90'});
    const payment=await service.createPayment(auth,{direction:'INBOUND',partnerId:customer,currency:'USD',amount:'100',valueDate:'2026-10-12',idempotencyKey:`fx-${suffix()}`});
    await assert.rejects(service.allocatePayment(auth,{paymentId:payment.id,obligationId:obligation.id,paymentAmount:'100',obligationAmount:'90'}),FinanceConflictError);
    const rate=await service.createFxRate(auth,{baseCurrency:'USD',quoteCurrency:'EUR',rate:'0.9',effectiveAt:'2026-10-12T00:00:00Z',source:'MANUAL_TEST'});
    await service.allocatePayment(auth,{paymentId:payment.id,obligationId:obligation.id,paymentAmount:'100',obligationAmount:'90',fxRateId:rate.id});
    const view=await db.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`,[obligation.id]);assert.equal(view.rows[0].settlement_status,'SETTLED');
  }finally{await db.close();}
});

test('landed-cost batch stays separate from Logistics and requires full capitalizable allocation before finalization', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=new FinanceService(db,new AuditService(db));const shipment=await shipmentCargo(db,auth.userId);
    const batch=await service.createLandedCostBatch(auth,{shipmentId:shipment.shipmentId,currency:'EUR',allocationBasis:'QUANTITY'});
    const freight=await service.addLandedCostComponent(auth,batch.id,{category:'FREIGHT',amount:'100',currency:'EUR',batchCurrencyAmount:'100',capitalizable:true});
    const vat=await service.addLandedCostComponent(auth,batch.id,{category:'IMPORT_VAT',amount:'19',currency:'EUR',batchCurrencyAmount:'19',capitalizable:false});
    await assert.rejects(service.finalizeLandedCostBatch(auth,batch.id),FinanceConflictError);
    await service.allocateLandedCost(auth,freight.id,{cargoId:shipment.cargoId,allocatedAmount:'100',basisValue:'1'});
    const finalized=await service.finalizeLandedCostBatch(auth,batch.id);assert.equal(finalized.status,'FINALIZED');
    const view=await db.query<any>(`SELECT * FROM finance.v_landed_cost_by_cargo WHERE shipment_id=$1 AND cargo_id=$2`,[shipment.shipmentId,shipment.cargoId]);assert.equal(Number(view.rows[0].capitalizable_cost),100);assert.equal(view.rows[0].noncapitalizable_cost,null);
    await assert.rejects(db.query(`UPDATE finance.landed_cost_components SET amount=101 WHERE id=$1`,[freight.id]),/immutable/);
    await assert.rejects(db.query(`DELETE FROM finance.landed_cost_batches WHERE id=$1`,[batch.id]),/cannot be deleted/);
    assert.equal(vat.capitalizable,false);
  }finally{await db.close();}
});
