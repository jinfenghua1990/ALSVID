import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';
import { ProductService } from './application/product-service.js';
import { PostgresProductRepository } from './infrastructure/postgres-product-repository.js';
import { ProductConflictError, ProductValidationError } from './core/errors.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const code=()=>('TP'+randomUUID().replaceAll('-','').slice(0,12)).toUpperCase();

test('real PostgreSQL persists platform, prevents duplicates and stale edits, controls bike references and archive',
  {skip:!hasDatabase},async()=>{
    const db=new Database();
    try {
      const result=await db.query<{id:string}>(
        "INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Product Platform CI','x') RETURNING id",
        ['platform-'+randomUUID()+'@example.com']);
      const actor={userId:result.rows[0]!.id,permissions:['product.read','product.write']};
      const events:string[]=[];
      const service=new ProductService(new PostgresProductRepository(db),{
        async record(e){events.push(e.action);},
      });
      const platformCode=code();
      const created=await service.createPlatform(actor,{code:platformCode.toLowerCase(),name:'New platform',description:'Real PG row'});
      assert.equal(created.status,'DRAFT');
      assert.equal(created.version,1);
      assert.equal((await service.catalog(actor)).platforms.find(p=>p.id===created.id)?.name,'New platform');
      await assert.rejects(()=>service.createPlatform(actor,{code:platformCode,name:'Duplicate'}),ProductConflictError);
      await assert.rejects(()=>service.createModel(actor,{
        platformId:created.id,code:code(),name:'Draft platform bike',
      }),ProductValidationError);
      const active=await service.updatePlatform(actor,created.id,{expectedVersion:1,status:'ACTIVE',name:'Updated platform'});
      assert.equal(active.version,2);
      await assert.rejects(()=>service.updatePlatform(actor,created.id,{expectedVersion:1,name:'Outdated'}),ProductConflictError);
      const bike=await service.createModel(actor,{platformId:created.id,code:code(),name:'Real test bike'});
      assert.equal(bike.platform_id,created.id);
      await assert.rejects(()=>service.updatePlatform(actor,created.id,{expectedVersion:2,status:'RETIRED'}),ProductValidationError);
      await service.updateEntity(actor,'model',bike.id,{expectedVersion:bike.version,status:'RETIRED'});
      const archived=await service.updatePlatform(actor,created.id,{expectedVersion:2,status:'RETIRED'});
      assert.equal(archived.version,3);
      const fetched=await db.query<{status:string;name:string;version:number}>(
        'SELECT status,name,version FROM product.platforms WHERE id=$1',[created.id]);
      assert.deepEqual(fetched.rows[0],{status:'RETIRED',name:'Updated platform',version:3});
      await assert.rejects(()=>service.createModel(actor,{
        platformId:created.id,code:code(),name:'Cannot reference retired platform',
      }),ProductValidationError);
      assert.deepEqual(events,[
        'product.platform_created','product.platform_updated','product.model_created',
        'product.model_updated','product.platform_updated',
      ]);
    }finally{await db.close();}
  });
