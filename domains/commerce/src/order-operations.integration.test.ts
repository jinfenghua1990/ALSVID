import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {Database} from '@alsvid/database';
import {createCommerceService} from './index.js';
import {CommerceOrderOperationsService} from './order-operations.js';

test('real Postgres order audit/readiness/refund review never approves payment or executes refund',
 {skip:!process.env.DATABASE_URL},async()=>{
 const db=new Database();
 const audit={record:async()=>{}};
 try{
  const tag=randomUUID().slice(0,12);
  const person=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash)
   VALUES ($1,'Commerce Operations DB Test','x') RETURNING id`,[`orderops-${tag}@example.com`]);
  const actor={userId:person.rows[0]!.id,permissions:['commerce.read','commerce.refund.review',
   'commerce.map','integrations.ingest']};
  const commerce=createCommerceService(db,audit);
  const channel=await commerce.createChannel(actor,{provider:'OTHER',channelKey:'ops-'+tag,
   displayName:'Operations Test Channel',externalAccountId:'account-'+tag});
  const order=await commerce.ingestOrder(actor,channel.id,'EVENT-'+tag,{
   externalOrderId:'ORDER-'+tag,orderStatus:'OPEN',financialStatus:'PAID',
   currency:'EUR',subtotalAmount:'1500.00',totalAmount:'1500.00',
   sourceUpdatedAt:'2026-10-20T00:00:00Z',
   lines:[{externalLineId:'LINE-'+tag,quantity:'1',unitPrice:'1500.00'}],
  },db);
  const operations=new CommerceOrderOperationsService(db,audit);
  const rows=await operations.readiness(actor);
  const blocked=rows.find(x=>x.orderId===order.order.id);
  assert.ok(blocked);
  assert.equal(blocked.sourceFinancialStatus,'PAID');
  assert.equal(blocked.productionReleaseAllowed,false);
  assert.equal(blocked.paymentVerifiedByPsp,false);
  const input={externalOrderId:order.order.id,clientRequestId:randomUUID(),requestedAmount:'75.00',
   currency:'EUR',reason:'Customer packaging issue requires manual review'};
  const review=await operations.requestRefundReview(actor,input);
  assert.equal(review.state,'REVIEW_REQUESTED');
  assert.equal(review.requestedAmount,'75.000000');
  const again=await operations.requestRefundReview(actor,input);
  assert.equal(again.id,review.id);
  await assert.rejects(operations.requestRefundReview(actor,{...input,requestedAmount:'150.00'}),{
   code:'COMMERCE_CONFLICT',
  });
  await assert.rejects(db.query(`UPDATE commerce.refund_review_requests SET reason='tampered' WHERE id=$1`,[review.id]),
   /immutable/);
  await assert.rejects(operations.requestRefundReview(actor,{...input,clientRequestId:randomUUID(),
   requestedAmount:'1500.01'}),{code:'COMMERCE_VALIDATION'});
  const out=await operations.refundReviews(actor);
  assert.ok(out.some(x=>x.id===review.id&&x.state==='REVIEW_REQUESTED'));
 }finally{await db.close();}
});
