import assert from 'node:assert/strict';
import test from 'node:test';
import { SupplierPortalService, type SupplierPortalRepository, type SupplierPortalOrder } from './application/supplier-portal-service.js';
import type { QueryExecutor } from '@alsvid/database';

const uuid='11111111-1111-4111-8111-111111111111';
const poId='22222222-2222-4222-8222-222222222222';
const lineId='33333333-3333-4333-8333-333333333333';
const supplier={userId:uuid,roles:['supplier_user'],permissions:['supplier.po.read','supplier.po.ack']};
const issued:SupplierPortalOrder={id:poId,poNumber:'PO-00000001',version:2,status:'ISSUED',currency:'EUR',
 supplierName:'Supplier A',issuedAt:'2026-10-19T00:00:00Z',
 lines:[{id:lineId,lineNo:10,description:'FC1 assembly',orderedQuantity:'4.000000',unit:'EA',requestedDate:'2026-11-19'}]};
function fixture(visible=true){
 let current={...issued};
 let confirmation=0;
 const requests=new Map<string,{payload:unknown;recordId:string}>();
 const events:string[]=[];
 const repo:SupplierPortalRepository={
  transaction:fn=>fn({} as QueryExecutor),
  list:async()=>visible?[current]:[],
  order:async()=>visible?current:null,
  acknowledgement:async(_id,requestId)=>requests.get(requestId)??null,
  confirm:async(po,_uid,_input,payload)=>{
   confirmation++;
   const id='44444444-4444-4444-8444-444444444444';
   requests.set(String(payload.clientRequestId),{payload:JSON.parse(JSON.stringify(payload)),recordId:id});
   current={...po,status:'CONFIRMED',version:po.version+1};
   return {id,poId:po.id,status:'CONFIRMED'};
  },
 };
 const service=new SupplierPortalService(repo,{record:async event=>{events.push(event.action);}});
 return {service,events,get count(){return confirmation}};
}
const ack={clientRequestId:'55555555-5555-4555-8555-555555555555',expectedVersion:2,note:'经核对确认全部数量与交期',lines:[{
 purchaseOrderLineId:lineId,confirmedQuantity:'4.000000',confirmedDate:'2026-11-19'}]};
test('supplier only reads matching member scope; spoofed PO IDs give no data',async()=>{
 const x=fixture(false);
 assert.deepEqual(await x.service.list(supplier),[]);
 await assert.rejects(x.service.detail(supplier,poId),{code:'PROCUREMENT_NOT_FOUND'});
 await assert.rejects(x.service.acknowledge(supplier,poId,ack),{code:'PROCUREMENT_NOT_FOUND'});
});
test('supplier without external supplier role cannot read or acknowledge internal PO',async()=>{
 const x=fixture();
 const dealer={...supplier,roles:['dealer_user']};
 await assert.rejects(x.service.list(dealer),{code:'SUPPLIER_SCOPE_FORBIDDEN'});
 await assert.rejects(x.service.acknowledge(dealer,poId,ack),{code:'SUPPLIER_SCOPE_FORBIDDEN'});
});
test('valid supplier confirmation is audited and retry is idempotent',async()=>{
 const x=fixture();
 const saved=await x.service.acknowledge(supplier,poId,ack);
 assert.equal(saved.status,'CONFIRMED');assert.equal(x.count,1);assert.equal(x.events.length,1);
 const retry=await x.service.acknowledge(supplier,poId,ack);
 assert.equal(retry.id,saved.id);assert.equal(x.count,1);assert.equal(x.events.length,1);
 await assert.rejects(x.service.acknowledge(supplier,poId,{...ack,note:'采用不同的第二次确认内容'}),{code:'PROCUREMENT_CONFLICT'});
});
test('supplier cannot alter ordered quantity, remove lines or ignore expected version',async()=>{
 const x=fixture();
 await assert.rejects(x.service.acknowledge(supplier,poId,{...ack,lines:[]}),{code:'PROCUREMENT_VALIDATION'});
 await assert.rejects(x.service.acknowledge(supplier,poId,{...ack,lines:[{...ack.lines[0]!,confirmedQuantity:'8.000000'}]}),{code:'PROCUREMENT_VALIDATION'});
 await assert.rejects(x.service.acknowledge(supplier,poId,{...ack,expectedVersion:1}),{code:'PROCUREMENT_CONFLICT'});
 assert.equal(x.count,0);
});

test('supplier cannot silently rewrite published delivery dates through PO acknowledgement',async()=>{
 const x=fixture();
 await assert.rejects(x.service.acknowledge(supplier,poId,{
  ...ack,lines:[{...ack.lines[0]!,confirmedDate:'2026-12-05'}]
 }),{code:'PROCUREMENT_VALIDATION'});
 await assert.rejects(x.service.acknowledge(supplier,poId,{
  ...ack,lines:[{...ack.lines[0]!,confirmedDate:'2026-11-20'}]
 }),{code:'PROCUREMENT_VALIDATION'});
 assert.equal(x.count,0);
 assert.deepEqual(x.events,[]);
});

test('omitting confirmed date implies acceptance of original issued PO date',async()=>{
 const x=fixture();
 const input={...ack,lines:[{purchaseOrderLineId:lineId,confirmedQuantity:'4.000000'}]};
 const saved=await x.service.acknowledge(supplier,poId,input);
 assert.equal(saved.status,'CONFIRMED');
 assert.equal(x.count,1);
 const retry=await x.service.acknowledge(supplier,poId,input);
 assert.equal(retry.id,saved.id);
 assert.equal(x.count,1);
});
