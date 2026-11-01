import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {Database} from '@alsvid/database';
import {createCommerceService} from './index.js';

test('external channel identifiers never replace ALSVID Product or SKU IDs',
 {skip:!process.env.DATABASE_URL},async()=>{
 const db=new Database();
 try{
  const tag=randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
  const user=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash)
   VALUES($1,'Stable Channel Mapping Test','x') RETURNING id`,[`stable-channel-${tag.toLowerCase()}@example.test`]);
  const actor={userId:user.rows[0]!.id,permissions:['commerce.read','commerce.map','integrations.ingest']};
  const platform=await db.query<{id:string}>('SELECT id FROM product.platforms WHERE code=\'FC\' LIMIT 1');
  const model=await db.query<{id:string;product_id:string}>(`INSERT INTO product.models(platform_id,code,name)
   VALUES($1,$2,'Stable channel mapping fixture') RETURNING id,product_id::text`,[platform.rows[0]!.id,`MAP-${tag}`]);
  const variant=await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name)
   VALUES($1,'DEFAULT','Default') RETURNING id`,[model.rows[0]!.id]);
  const sku=await db.query<{id:string;product_id:string;sku_number:string}>(`INSERT INTO product.skus(variant_id,sku,name)
   VALUES($1,$2,'Mapped SKU') RETURNING id,product_id::text,sku_number::text`,[variant.rows[0]!.id,`ALS-${tag}`]);
  const service=createCommerceService(db,{record:async()=>{}});
  const channel=await service.createChannel(actor,{provider:'OTHER',channelKey:`stable-${tag}`,
   displayName:'Stable ID Test Channel',externalAccountId:`account-${tag}`});
  const externalProductId=`EXT-PRODUCT-${tag}`,externalVariantId=`EXT-VARIANT-${tag}`;
  await service.mapVariant(actor,{channelId:channel.id,externalProductId,externalVariantId,
   externalSku:`EXT-SKU-${tag}`,skuId:sku.rows[0]!.id});
  const order=await service.ingestOrder(actor,channel.id,`EVENT-${tag}`,{
   externalOrderId:`EXT-ORDER-${tag}`,orderStatus:'OPEN',currency:'EUR',subtotalAmount:'1',totalAmount:'1',
   lines:[{externalLineId:`EXT-LINE-${tag}`,externalProductId,externalVariantId,
    externalSku:`EXT-SKU-${tag}`,quantity:'1',unitPrice:'1'}],
  },db);
  const line=await db.query<{external_product_id:string;external_variant_id:string;sku_id:string;
   product_id:string;sku_number:string}>(`SELECT external_product_id,external_variant_id,sku_id,
   product_id::text,sku_number::text FROM commerce.external_order_lines WHERE order_id=$1`,[order.order.id]);
  assert.deepEqual(line.rows[0],{external_product_id:externalProductId,external_variant_id:externalVariantId,
   sku_id:sku.rows[0]!.id,product_id:model.rows[0]!.product_id,sku_number:sku.rows[0]!.sku_number});
  assert.notEqual(line.rows[0]!.product_id,externalProductId);
  assert.notEqual(line.rows[0]!.sku_number,externalVariantId);
  await db.query("UPDATE product.skus SET status='RETIRED' WHERE id=$1",[sku.rows[0]!.id]);
  await db.query("UPDATE product.variants SET status='RETIRED' WHERE id=$1",[variant.rows[0]!.id]);
  await db.query("UPDATE product.models SET status='RETIRED',version=version+1,updated_at=now() WHERE id=$1",[model.rows[0]!.id]);
 }finally{await db.close();}
});
