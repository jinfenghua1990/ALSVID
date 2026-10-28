import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {Database} from '@alsvid/database';
import {ProductService} from './application/product-service.js';
import {PostgresProductRepository} from './infrastructure/postgres-product-repository.js';
import {ProductConflictError,ProductValidationError} from './core/errors.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const unique=()=>randomUUID().replaceAll('-','').slice(0,14).toUpperCase();

test('real PostgreSQL persists typed model custom fields, preserves history and checks writes',
  {skip:!hasDatabase},async()=>{
    const db=new Database();
    try {
      const u=await db.query<{id:string}>(
        "INSERT INTO identity.users(email,display_name,password_hash) VALUES($1,'Field CI','x') RETURNING id",
        ['field-'+randomUUID()+'@example.com']);
      const actor={userId:u.rows[0]!.id,permissions:['product.read','product.write']};
      const reader={userId:actor.userId,permissions:['product.read']};
      const events:string[]=[];
      const service=new ProductService(new PostgresProductRepository(db),{async record(event){events.push(event.action);}});
      const code='W'+unique(), optionCode='O'+unique(), modelCode='P'+unique();
      await assert.rejects(()=>service.createModelField(reader,{
        productTypeCode:'SERVICE_PART',code,label:'Test field',fieldType:'TEXT',
      }),/product.write/);
      await assert.rejects(()=>service.createModelField(actor,{
        productTypeCode:'SERVICE_PART',code,label:'Bad',fieldType:'SELECT',options:[],
      }),ProductValidationError);
      const field=await service.createModelField(actor,{
        productTypeCode:'SERVICE_PART',code:code.toLowerCase(),label:'Weight label',fieldType:'NUMBER',required:true,
      });
      assert.equal(field.code,code);
      assert.equal(field.version,1);
      await assert.rejects(()=>service.createModelField(actor,{
        productTypeCode:'SERVICE_PART',code,label:'Duplicate',fieldType:'TEXT',
      }),ProductConflictError);
      const option=await service.createModelField(actor,{
        productTypeCode:'SERVICE_PART',code:optionCode,label:'Choice',fieldType:'SELECT',options:['one','two'],
      });
      const definitions=(await service.catalog(actor)).modelFieldDefinitions;
      assert.ok(definitions.some(item=>item.id===field.id));
      await assert.rejects(()=>service.createModel(actor,{
        code:modelCode,name:'Required field missing',productTypeCode:'SERVICE_PART',
      }),ProductValidationError);
      await assert.rejects(()=>service.createModel(actor,{
        code:modelCode,name:'Wrong field type',productTypeCode:'SERVICE_PART',customFields:{[code]:'too heavy'},
      }),ProductValidationError);
      const created=await service.createModel(actor,{
        code:modelCode,name:'Model with typed fields',productTypeCode:'SERVICE_PART',
        customFields:{[code]:12.5,[optionCode]:'one'},
      });
      assert.equal(created.custom_fields[code],12.5);
      assert.equal(created.custom_fields[optionCode],'one');
      await assert.rejects(()=>service.updateEntity(actor,'model',created.id,{
        expectedVersion:created.version,customFields:{[code]:4,[optionCode]:'invalid'},
      }),ProductValidationError);
      const updated=await service.updateEntity(actor,'model',created.id,{
        expectedVersion:created.version,name:'Updated model',
        customFields:{[code]:19.4,[optionCode]:'two'},
      });
      assert.equal(updated.version,created.version+1);
      assert.equal(updated.custom_fields[code],19.4);
      await assert.rejects(()=>service.updateEntity(actor,'model',created.id,{
        expectedVersion:created.version,customFields:{[code]:19.4},
      }),ProductConflictError);
      const retired=await service.updateModelField(actor,option.id,{
        expectedVersion:option.version,status:'RETIRED',
      });
      assert.equal(retired.status,'RETIRED');
      await assert.rejects(()=>service.updateModelField(actor,option.id,{
        expectedVersion:option.version,label:'Stale',
      }),ProductConflictError);
      const unchanged=await service.updateEntity(actor,'model',created.id,{
        expectedVersion:updated.version,customFields:{[code]:22},
      });
      assert.equal(unchanged.custom_fields[optionCode],'two','retired field historical value must persist');
      assert.equal((await db.query<{custom_fields:Record<string,unknown>}>(
        'SELECT custom_fields FROM product.models WHERE id=$1',[created.id])).rows[0]!.custom_fields[code],22);
      assert.ok(events.includes('product.model_field_created'));
      assert.ok(events.includes('product.model_field_updated'));
      assert.ok(events.includes('product.model_updated'));
    }finally{await db.close();}
  });
