import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';
import { ProductService } from './application/product-service.js';
import { PostgresProductRepository } from './infrastructure/postgres-product-repository.js';

const code=()=>('I'+randomUUID().replaceAll('-','').slice(0,15)).toUpperCase();

test('Product and SKU numbers are stable, generated concurrently, and never reused',
 {skip:!process.env.DATABASE_URL},async()=>{
  const db=new Database();
  try{
   const user=await db.query<{id:string}>(
    "INSERT INTO identity.users(email,display_name,password_hash) VALUES($1,'Stable ID Test','x') RETURNING id",
    [`stable-id-${randomUUID()}@example.test`]);
   const actor={userId:user.rows[0]!.id,permissions:['product.read','product.write']};
   const service=new ProductService(new PostgresProductRepository(db),{record:async()=>{}});
   const product=await service.createModel(actor,{productTypeCode:'ACCESSORY',code:code(),name:'Stable product'});
   assert.match(product.product_id,/^[1-9]\d{5}$/);
   assert.equal(product.default_sku.sku_sequence,1);
   assert.equal(product.default_sku.sku_number,`${product.product_id}001`);

   const renamed=await service.updateEntity(actor,'model',product.id,{expectedVersion:product.version,name:'Renamed product'});
   assert.equal(renamed.product_id,product.product_id);
   assert.equal(renamed.name,'Renamed product');
   const renamedSku=await service.updateEntity(actor,'sku',product.default_sku.id,
    {expectedVersion:1,name:'Changed default SKU',colorCode:'CHARCOAL'});
   assert.equal(renamedSku.sku_number,product.default_sku.sku_number);

   const results=await Promise.all(Array.from({length:20},(_,index)=>service.createSku(actor,{
    variantId:product.default_variant_id,sku:code(),name:`Variant ${index+1}`,colorCode:`COLOR-${index+1}`,
   })));
   const numbers=results.map(row=>row.sku_number).sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
   assert.deepEqual(numbers,Array.from({length:20},(_,index)=>`${product.product_id}${String(index+2).padStart(3,'0')}`));

   const second=await service.createModel(actor,{productTypeCode:'ACCESSORY',code:code(),name:'Second product'});
   assert.notEqual(second.product_id,product.product_id);
   assert.notEqual(second.default_sku.sku_number,product.default_sku.sku_number);
   await assert.rejects(db.query('DELETE FROM product.skus WHERE id=$1',[product.default_sku.id]),/never physically deleted/);
   await assert.rejects(db.query('DELETE FROM product.models WHERE id=$1',[product.id]),/never physically deleted/);

   await db.query('UPDATE product.models SET next_sku_sequence=1000 WHERE id=$1',[product.id]);
   await assert.rejects(()=>service.createSku(actor,{variantId:product.default_variant_id,
    sku:code(),name:'Over capacity',colorCode:'CAPACITY'}),/exhausted its 999 SKU IDs/);
   await db.query("UPDATE product.skus SET status='RETIRED' WHERE product_id=ANY($1::bigint[])",
    [[product.product_id,second.product_id]]);
   await db.query("UPDATE product.variants SET status='RETIRED' WHERE model_id=ANY($1::uuid[])",
    [[product.id,second.id]]);
   await db.query("UPDATE product.models SET status='RETIRED',version=version+1,updated_at=now() WHERE id=ANY($1::uuid[])",
    [[product.id,second.id]]);
  }finally{await db.close();}
 });
