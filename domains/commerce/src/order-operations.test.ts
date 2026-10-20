import assert from 'node:assert/strict';
import test from 'node:test';
import type { DatabasePort,QueryExecutor } from '@alsvid/database';
import { CommerceOrderOperationsService,assessExternalOrder } from './order-operations.js';
import type { CommerceAuditPort } from './application/ports.js';

const actor={userId:'11111111-1111-4111-8111-111111111111',permissions:['commerce.read','commerce.refund.review']};
const orderId='22222222-2222-4222-8222-222222222222';
const requestId='33333333-3333-4333-8333-333333333333';
const orderRow={id:orderId,external_order_name:'#FC1-019',external_order_id:'019',
 channel_key:'legacy-shopify',order_status:'OPEN',financial_status:'PAID',currency:'EUR',
 total_amount:'1500.000000',customer_partner_id:'44444444-4444-4444-8444-444444444444',
 line_count:'1',unmapped_lines:'0'};
const input={externalOrderId:orderId,clientRequestId:requestId,requestedAmount:'75.00',currency:'EUR',
 reason:'Customer requests partial refund review for damaged packaging'};
test('provider reported PAID is never trusted as verified PSP capture or production authorization',()=>{
 const row=assessExternalOrder(orderRow);
 assert.equal(row.sourceFinancialStatus,'PAID');
 assert.equal(row.paymentVerifiedByPsp,false);
 assert.equal(row.productionReleaseAllowed,false);
 assert.equal(row.refundExecutionAllowed,false);
 assert.match(row.blockers.join(' / '),/支付机构/);
 const other=assessExternalOrder({...orderRow,line_count:'0',unmapped_lines:'2',customer_partner_id:null,order_status:'CANCELLED'});
 assert.equal(other.productionReleaseAllowed,false);
 assert.ok(other.blockers.length>=4);
});

function fixture(){
 let current:any=null;
 let writes=0;
 let audits=0;
 const db={
  transaction:async<T>(f:(e:QueryExecutor)=>Promise<T>):Promise<T>=>f(db as unknown as QueryExecutor),
  query:async(sql:string,params:unknown[]=[])=>{
   if(sql.includes('WHERE requested_by=$1 AND client_request_id=$2'))
    return {rows:current?[current]:[],rowCount:current?1:0};
   if(sql.includes('FROM commerce.external_orders WHERE id=$1 FOR UPDATE'))
    return {rows:params[0]===orderId?[{id:orderId,total_amount:'1500.000000',currency:'EUR'}]:[],rowCount:params[0]===orderId?1:0};
   if(sql.includes('INSERT INTO commerce.refund_review_requests')){
    writes++;
    current={id:'55555555-5555-4555-8555-555555555555',external_order_id:params[0],
     client_request_id:params[1],requested_by:params[2],requested_amount:'75.000000',
     currency:params[4],reason:params[5],state:'REVIEW_REQUESTED',requested_at:new Date('2026-10-20T00:00:00.000Z')};
    return {rows:[current],rowCount:1};
   }
   if(sql.includes('SELECT id,external_order_id,client_request_id,requested_by')){
    return {rows:current?[current]:[],rowCount:current?1:0};
   }
   if(sql.includes('SELECT o.id,o.external_order_name')){
    return {rows:[orderRow],rowCount:1};
   }
   throw new Error('Unmocked SQL '+sql.slice(0,80));
  },
  close:async()=>{},
 } as unknown as DatabasePort;
 const audit={record:async()=>{audits++}} as unknown as CommerceAuditPort;
 return {service:new CommerceOrderOperationsService(db,audit),get writes(){return writes},get audits(){return audits}};
}
test('refund review is an immutable review request, idempotent on retry, never a PSP refund',async()=>{
 const f=fixture();
 const first=await f.service.requestRefundReview(actor,input);
 assert.equal(first.state,'REVIEW_REQUESTED');
 assert.equal(first.requestedAmount,'75.000000');
 const repeated=await f.service.requestRefundReview(actor,input);
 assert.equal(repeated.id,first.id);
 assert.equal(f.writes,1);assert.equal(f.audits,1);
 await assert.rejects(f.service.requestRefundReview(actor,{...input,reason:'Different reason text for a different refund'}),{code:'COMMERCE_CONFLICT'});
 assert.equal(f.writes,1);
});
test('wrong permissions, order, currency and amount are refused before review is recorded',async()=>{
 const f=fixture();
 await assert.rejects(f.service.refundReviews({...actor,permissions:[]}),{code:'COMMERCE_FORBIDDEN'});
 await assert.rejects(f.service.readiness({...actor,permissions:[]}),{code:'COMMERCE_FORBIDDEN'});
 await assert.rejects(f.service.requestRefundReview({...actor,permissions:['commerce.read']},input),{code:'COMMERCE_FORBIDDEN'});
 await assert.rejects(f.service.requestRefundReview(actor,{...input,requestedAmount:'0'}),{code:'COMMERCE_VALIDATION'});
 await assert.rejects(f.service.requestRefundReview(actor,{...input,requestedAmount:'1600'}),{code:'COMMERCE_VALIDATION'});
 await assert.rejects(f.service.requestRefundReview(actor,{...input,currency:'USD'}),{code:'COMMERCE_VALIDATION'});
 await assert.rejects(f.service.requestRefundReview(actor,{...input,reason:'short'}),{code:'COMMERCE_VALIDATION'});
 await assert.rejects(f.service.requestRefundReview(actor,{...input,externalOrderId:'99999999-9999-4999-8999-999999999999'}),{code:'COMMERCE_NOT_FOUND'});
 assert.equal(f.writes,0);
});
