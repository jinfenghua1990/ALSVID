import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {Database} from '@alsvid/database';
import {StorefrontOrderService} from './storefront-orders.js';

test('first-party orders are immutable priced drafts; retries are idempotent; production link is payment-gated',
 {skip:!process.env.DATABASE_URL},async()=>{
 const db=new Database(),audit={record:async()=>{}};
 try{
  const tag=randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
  const user=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash)
   VALUES($1,'Storefront Order Integration Test','x') RETURNING id`,[`storefront-${tag.toLowerCase()}@example.com`]);
  const actor={userId:user.rows[0]!.id,permissions:['commerce.storefront.read','commerce.storefront.write','commerce.price.manage','production.read','production.write']};
  const platform=await db.query<{id:string}>(`SELECT id FROM product.platforms WHERE code='FC' LIMIT 1`);
  assert.ok(platform.rows[0],'FC platform fixture is required');
  const model=await db.query<{id:string}>(`INSERT INTO product.models(platform_id,code,name,status)
   VALUES($1,$2,'Storefront Test Model','ACTIVE') RETURNING id`,[platform.rows[0]!.id,`M-${tag}`]);
  const variant=await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name,status)
   VALUES($1,$2,'Storefront Test Variant','ACTIVE') RETURNING id`,[model.rows[0]!.id,`V-${tag}`]);
  const sku=await db.query<{id:string}>(`INSERT INTO product.skus(variant_id,sku,name,status,color_code)
   VALUES($1,$2,'Storefront Test SKU','ACTIVE','GRAPHITE') RETURNING id`,[variant.rows[0]!.id,`SKU-${tag}`]);
  const service=new StorefrontOrderService(db,audit);
  const price=await service.createPrice(actor,{skuId:sku.rows[0]!.id,marketCountry:'DE',unitPriceGross:'119.00',taxRateBasisPoints:1900});
  assert.equal(price.status,'DRAFT');
  const active=await service.activatePrice(actor,price.id,price.version);
  assert.equal(active.status,'ACTIVE');
  assert.equal(active.version,2);
  await assert.rejects(db.query(`UPDATE commerce.storefront_prices SET unit_price_gross=120.00 WHERE id=$1`,[price.id]),/immutable/);
  const duplicatePrice=await service.createPrice(actor,{skuId:sku.rows[0]!.id,marketCountry:'DE',unitPriceGross:'125.00',taxRateBasisPoints:1900});
  await assert.rejects(service.activatePrice(actor,duplicatePrice.id,duplicatePrice.version),{code:'COMMERCE_CONFLICT'});
  await assert.rejects(db.transaction(async executor=>{
   await executor.query(`INSERT INTO commerce.storefront_orders(customer_email,market_country,currency,status,payment_status,
    total_net_amount,total_tax_amount,total_gross_amount,client_request_id,request_sha256,created_by,updated_by)
    VALUES('no-lines@example.com','DE','EUR','DRAFT','NOT_CONFIGURED',100.00,19.00,119.00,$1,$2,$3,$3)`,
    [randomUUID(),'a'.repeat(64),actor.userId]);
  }),/totals must exactly equal/);
  const input={clientRequestId:randomUUID(),customerEmail:'Customer@Example.com',marketCountry:'DE' as const,
   items:[{skuId:sku.rows[0]!.id,quantity:1}]};
  const order=await service.createDraftOrder(actor,input);
  assert.match(order.orderNumber,/^ALS-ORD-/);
  assert.equal(order.customerEmail,'customer@example.com');
  assert.equal(order.status,'DRAFT');
  assert.equal(order.paymentStatus,'NOT_CONFIGURED');
  assert.equal(order.totalGrossAmount,'119.00');
  assert.equal(order.totalNetAmount,'100.00');
  assert.equal(order.totalTaxAmount,'19.00');
  assert.equal(order.lines.length,1);
  assert.equal(order.lines[0]!.skuCode,`SKU-${tag}`);
  assert.equal(order.checkoutEnabled,false);
  assert.equal(order.productionDemandAllowed,false);
  assert.ok(order.blockers.length>=3);
  const repeated=await service.createDraftOrder(actor,input);
  assert.equal(repeated.id,order.id);
  await assert.rejects(service.createDraftOrder(actor,{...input,items:[{skuId:sku.rows[0]!.id,quantity:2}]}),{code:'COMMERCE_CONFLICT'});
  await assert.rejects(db.query(`INSERT INTO production.production_orders(build_spec_id,factory_partner_id,planned_quantity,source_storefront_order_line_id,created_by,updated_by) VALUES($1,$2,1,$3,$4,$4)`,[randomUUID(),randomUUID(),order.lines[0]!.id,actor.userId]),/payment-verified first-party order/);
  await assert.rejects(db.query(`UPDATE commerce.storefront_order_lines SET quantity=2 WHERE id=$1`,[order.lines[0]!.id]),/immutable/);
  const cancelled=await service.cancelDraftOrder(actor,order.id,order.version,'Customer details entered incorrectly');
  assert.equal(cancelled.status,'CANCELLED');
  await assert.rejects(service.cancelDraftOrder(actor,order.id,cancelled.version,'Another cancellation reason'),{code:'COMMERCE_CONFLICT'});
  const eventCount=await db.query<{count:string}>(`SELECT count(*)::text AS count FROM commerce.storefront_order_events WHERE order_id=$1`,[order.id]);
  assert.equal(Number(eventCount.rows[0]!.count),2);
  const summary=await service.summary(actor);
  assert.ok(summary.orders.some(x=>x.id===order.id));
  assert.ok(summary.prices.some(x=>x.id===price.id));
  const readonlySummary=await service.summary({userId:actor.userId,permissions:['commerce.storefront.read']});
  assert.equal(readonlySummary.orders.find(x=>x.id===order.id)?.customerEmail,'已隐藏');
 }finally{await db.close();}
});
