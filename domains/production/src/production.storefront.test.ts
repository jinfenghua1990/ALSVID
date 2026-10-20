import assert from 'node:assert/strict';
import test from 'node:test';
import type {QueryExecutor} from '@alsvid/database';
import type {ProductionAuditPort,ProductionRepository} from './application/ports.js';
import {ProductionService} from './application/production-service.js';

const orderId='11111111-1111-4111-8111-111111111111';
const factoryId='22222222-2222-4222-8222-222222222222';
const actor={userId:'33333333-3333-4333-8333-333333333333',
 permissions:['production.write','commerce.storefront.production']};
function fixture(orderStatus='DRAFT'){
 const repository={
  transaction:async<T>(work:(e:QueryExecutor)=>Promise<T>)=>work({} as QueryExecutor),
  getStorefrontOrderProductionContext:async()=>({order:{id:orderId,order_number:'ALS-ORD-00000001',
   status:orderStatus,payment_status:orderStatus==='DRAFT'?'NOT_CONFIGURED':'VERIFIED',
   tax_configuration_status:orderStatus==='DRAFT'?'ADMIN_CONFIGURED_UNVERIFIED':'VERIFIED',
   total_gross_amount:'119.00',currency:'EUR'},paymentEvidence:orderStatus!=='DRAFT',
   factoryValid:true,lines:[{line_id:'44444444-4444-4444-8444-444444444444',sku_id:'55555555-5555-4555-8555-555555555555',quantity:1,build_spec_id:'66666666-6666-4666-8666-666666666666'}],existing:[]}),
  createOrder:async()=>({id:'77777777-7777-4777-8777-777777777777',production_order_number:'MO-00000001'}),
  advanceStorefrontOrderToFulfillment:async()=>true,
 } as unknown as ProductionRepository;
 const audit={record:async()=>{}} as unknown as ProductionAuditPort;
 return new ProductionService(repository,audit);
}
test('production demand cannot be created from an internal unpaid order draft',async()=>{
 const service=fixture();
 await assert.rejects(service.createFromStorefrontOrder(actor,orderId,factoryId),{code:'PRODUCTION_CONFLICT'});
});
test('production demand requires the explicit cross-domain permission',async()=>{
 const service=fixture('PAYMENT_VERIFIED');
 await assert.rejects(service.createFromStorefrontOrder({...actor,permissions:['production.write']},orderId,factoryId),{code:'PRODUCTION_FORBIDDEN'});
});
test('invalid order or factory identifiers are rejected before any repository call',async()=>{
 const service=fixture();
 await assert.rejects(service.createFromStorefrontOrder(actor,'bad-id',factoryId),{code:'PRODUCTION_VALIDATION'});
});
