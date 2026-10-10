import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { AuditService } from '@alsvid/audit';
import { CommerceService } from '@alsvid/commerce';
import { Database } from '@alsvid/database';
import type { AuthContext } from '@alsvid/identity';
import { IntegrationConflictError, IntegrationService } from './index.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const suffix=()=>randomUUID().replaceAll('-','').slice(0,10).toUpperCase();

async function actor(db:Database):Promise<AuthContext>{
  const email=`commerce-${suffix().toLowerCase()}@example.com`;
  const row=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Commerce Test','x') RETURNING id`,[email]);
  return{userId:row.rows[0]!.id,email,displayName:'Commerce Test',roles:['commerce_manager','integration_operator'],permissions:['commerce.read','commerce.map','commerce.reconcile','integrations.ingest','integrations.replay','integrations.admin','partner.read','product.read']};
}

async function sku(db:Database):Promise<string>{
  const key=suffix();const platform=await db.query<{id:string}>(`SELECT id FROM product.platforms WHERE code='FC'`);
  const model=await db.query<{id:string}>(`INSERT INTO product.models(platform_id,code,name,status) VALUES ($1,$2,'Commerce Model','ACTIVE') RETURNING id`,[platform.rows[0]!.id,`CM${key}`]);
  const variant=await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name,status) VALUES ($1,'BASE','Base','ACTIVE') RETURNING id`,[model.rows[0]!.id]);
  const row=await db.query<{id:string}>(`INSERT INTO product.skus(variant_id,sku,name,status) VALUES ($1,$2,'Commerce SKU','ACTIVE') RETURNING id`,[variant.rows[0]!.id,`SKU-${key}`]);
  return row.rows[0]!.id;
}

function orderPayload(orderId:string,variantId:string,updatedAt='2026-10-10T10:00:00Z',cancelled=false){return{
  id:orderId,name:`#${orderId}`,currency:'EUR',subtotal_price:'1999.00',total_price:'1999.00',financial_status:'paid',fulfillment_status:null,
  created_at:'2026-10-10T09:00:00Z',updated_at:updatedAt,...(cancelled?{cancelled_at:updatedAt}:{}),customer:{id:`C-${orderId}`},
  line_items:[{id:`L-${orderId}`,product_id:`P-${orderId}`,variant_id:variantId,sku:'EXT-FC1',title:'FC1',quantity:1,price:'1999.00',updated_at:updatedAt}],
};}

test('Shopify delivery is idempotent, unknown variants stay exceptions, and manual SKU mapping survives updates', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const audit=new AuditService(db);const commerce=new CommerceService(db,audit);const integrations=new IntegrationService(db,audit,commerce);
    const channel=await commerce.createChannel(auth,{provider:'SHOPIFY',channelKey:`shop-${suffix()}`,displayName:'Shopify EU',externalAccountId:`${suffix().toLowerCase()}.myshopify.com`});
    const payload=orderPayload('1001','VAR-UNKNOWN');
    const delivery={webhookId:`WH-${suffix()}`,eventId:`EV-${suffix()}`,topic:'orders/create',shopDomain:channel.external_account_id,apiVersion:'2026-10',triggeredAt:'2026-10-10T10:00:01Z',payload};
    const first=await integrations.ingestShopify(auth,channel.id,delivery);assert.equal(first.duplicate,false);
    const duplicate=await integrations.ingestShopify(auth,channel.id,delivery);assert.equal(duplicate.duplicate,true);assert.equal(duplicate.attempt.outcome,'NOOP');

    const facts=await commerce.summary(auth);assert.equal(facts.orders.length,1);assert.equal(facts.lines.length,1);assert.equal(facts.lines[0].mapped_sku,null);
    const open=facts.exceptions.find((item:any)=>item.exception_type==='UNKNOWN_VARIANT'&&item.status==='OPEN');assert.ok(open,'unknown variant must remain visible');
    const productCount=await db.query<{count:number}>(`SELECT count(*)::int AS count FROM product.skus WHERE sku='EXT-FC1'`);assert.equal(productCount.rows[0]!.count,0,'provider SKU must never auto-create Product master');

    const skuId=await sku(db);await commerce.mapVariant(auth,{channelId:channel.id,externalVariantId:'VAR-UNKNOWN',externalSku:'EXT-FC1',skuId});
    const mapped=await db.query<any>(`SELECT sku_id,mapping_source FROM commerce.external_order_lines WHERE external_line_id='L-1001'`);assert.equal(mapped.rows[0].sku_id,skuId);assert.equal(mapped.rows[0].mapping_source,'MANUAL');
    const resolved=await db.query<any>(`SELECT status FROM commerce.mapping_exceptions WHERE id=$1`,[open.id]);assert.equal(resolved.rows[0].status,'RESOLVED');

    const updatePayload=orderPayload('1001','VAR-UNKNOWN','2026-10-10T11:00:00Z');
    await integrations.ingestShopify(auth,channel.id,{...delivery,webhookId:`WH-${suffix()}`,eventId:`EV-${suffix()}`,topic:'orders/updated',triggeredAt:'2026-10-10T11:00:01Z',payload:updatePayload});
    const preserved=await db.query<any>(`SELECT sku_id,mapping_source FROM commerce.external_order_lines WHERE external_line_id='L-1001'`);assert.equal(preserved.rows[0].sku_id,skuId);assert.equal(preserved.rows[0].mapping_source,'MANUAL');

    const stale=orderPayload('1001','VAR-UNKNOWN','2026-10-10T09:30:00Z',true);
    await integrations.ingestShopify(auth,channel.id,{...delivery,webhookId:`WH-${suffix()}`,eventId:`EV-${suffix()}`,topic:'orders/updated',triggeredAt:'2026-10-10T11:10:00Z',payload:stale});
    const current=await db.query<any>(`SELECT order_status,source_updated_at FROM commerce.external_orders WHERE channel_id=$1 AND external_order_id='1001'`,[channel.id]);assert.equal(current.rows[0].order_status,'OPEN');assert.equal(new Date(current.rows[0].source_updated_at).toISOString(),'2026-10-10T11:00:00.000Z');

    await assert.rejects(integrations.ingestShopify(auth,channel.id,{...delivery,payload:{...payload,total_price:'1.00'}}),IntegrationConflictError);
    const receipts=await db.query<{count:number}>(`SELECT count(*)::int AS count FROM integrations.webhook_receipts WHERE channel_id=$1 AND provider_event_id=$2`,[channel.id,delivery.webhookId]);assert.equal(receipts.rows[0]!.count,1);
  }finally{await db.close();}
});

test('rejected fulfillment evidence is retained and can be replayed after its order arrives', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const audit=new AuditService(db);const commerce=new CommerceService(db,audit);const integrations=new IntegrationService(db,audit,commerce);
    const channel=await commerce.createChannel(auth,{provider:'SHOPIFY',channelKey:`shop-${suffix()}`,displayName:'Shopify Replay',externalAccountId:`${suffix().toLowerCase()}.myshopify.com`});
    const webhookId=`WH-${suffix()}`;
    const fulfillment={id:'F-2001',order_id:'2001',status:'success',created_at:'2026-10-10T12:00:00Z',updated_at:'2026-10-10T12:00:00Z',tracking_company:'DHL',tracking_number:'DHL-1',line_items:[{id:'L-2001',quantity:1}]};
    await assert.rejects(integrations.ingestShopify(auth,channel.id,{webhookId,topic:'fulfillments/create',shopDomain:channel.external_account_id,triggeredAt:'2026-10-10T12:00:01Z',payload:fulfillment}),IntegrationConflictError);
    const receipt=await db.query<any>(`SELECT * FROM integrations.webhook_receipts WHERE channel_id=$1 AND provider_event_id=$2`,[channel.id,webhookId]);assert.ok(receipt.rows[0]);
    const rejected=await db.query<any>(`SELECT * FROM integrations.ingestion_attempts WHERE receipt_id=$1 ORDER BY attempt_number`,[receipt.rows[0].id]);assert.equal(rejected.rows.length,1);assert.equal(rejected.rows[0].outcome,'REJECTED');

    await integrations.ingestShopify(auth,channel.id,{webhookId:`WH-${suffix()}`,topic:'orders/create',shopDomain:channel.external_account_id,triggeredAt:'2026-10-10T11:59:01Z',payload:orderPayload('2001','VAR-2001','2026-10-10T11:59:00Z')});
    const replay=await integrations.replayShopify(auth,receipt.rows[0].id);assert.equal(replay.attempt.outcome,'PROCESSED');
    const fulfillmentFact=await db.query<any>(`SELECT * FROM commerce.fulfillments WHERE channel_id=$1 AND external_fulfillment_id='F-2001'`,[channel.id]);assert.ok(fulfillmentFact.rows[0]);assert.equal(fulfillmentFact.rows[0].tracking_number,'DHL-1');
  }finally{await db.close();}
});
