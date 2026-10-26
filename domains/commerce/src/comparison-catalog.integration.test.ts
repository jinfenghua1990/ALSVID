import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {Database} from '@alsvid/database';
import {ForbiddenError} from '@alsvid/kernel';
import {createComparisonCatalogService,CommerceConflictError,CommerceNotFoundError,CommerceValidationError} from './index.js';
const hasDatabase=Boolean(process.env.DATABASE_URL);
const noopAudit={async record():Promise<void>{}};
const input=(code:string)=>({code,title:{zh:'FC1 独立实验',de:'FC1 Vergleich',en:'FC1 comparison'},
  description:{zh:'参考资料',de:'Referenz',en:'Reference'},referenceImage:'FC1',proposedPriceMinor:null});
async function owner(db:Database) {
  const result=await db.query<{id:string}>("INSERT INTO identity.users(email,display_name,password_hash) VALUES($1,'Lab CI','x') RETURNING id",
    ['lab-'+randomUUID()+'@example.com']);
  return {userId:result.rows[0]!.id,roles:['system_admin'],permissions:['commerce.read','commerce.map']};
}
test('comparison catalog persists independently, protects drafts, checks version and excludes retired rows',{skip:!hasDatabase},async()=>{
  const db=new Database(); const code='LAB-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
  try {
    const auth=await owner(db); const events:unknown[]=[];
    const service=createComparisonCatalogService(db,{async record(event){events.push(event);}});
    const original=await db.query<{count:string}>('SELECT count(*)::text AS count FROM product.models WHERE code=$1',[code]);
    const created=await service.create(auth,input(code));
    assert.equal(created.status,'DRAFT'); assert.equal(created.version,1);
    assert.equal((await service.adminList(auth,{query:code})).items[0]!.id,created.id);
    assert.equal((await service.publicList({query:code})).total,0);
    await assert.rejects(service.publicProduct(created.id),CommerceNotFoundError);
    const update={title:created.title,description:created.description,referenceImage:created.referenceImage,
      proposedPriceMinor:259900,status:'PUBLISHED',expectedVersion:created.version};
    const published=await service.update(auth,created.id,update);
    assert.equal(published.version,2);
    const visible=await service.publicList({query:code});
    assert.equal(visible.items[0]!.proposedPriceMinor,259900);
    assert.ok(!JSON.stringify(visible).includes(auth.userId));
    await assert.rejects(service.update(auth,created.id,update),CommerceConflictError);
    const archived=await service.update(auth,created.id,{...update,expectedVersion:2,status:'ARCHIVED'});
    assert.equal(archived.version,3);
    assert.equal((await service.publicList({query:code})).total,0);
    await assert.rejects(service.create({...auth,roles:['dealer_user']},input(code+'-D')),ForbiddenError);
    await assert.rejects(service.create({...auth,permissions:['commerce.read']},input(code+'-R')),ForbiddenError);
    await assert.rejects(service.create(auth,input(code)),CommerceConflictError);
    for(const bad of [{...input(code+'-X'),proposedPriceMinor:0.1},{...input(code+'-X'),title:{zh:'缺少翻译'}},
      {...input(code+'-X'),stock:123},{...input(code+'-X'),referenceImage:'javascript:alert(1)'}])
      await assert.rejects(service.create(auth,bad),CommerceValidationError);
    const unchanged=await db.query<{count:string}>('SELECT count(*)::text AS count FROM product.models WHERE code=$1',[code]);
    assert.equal(unchanged.rows[0]!.count,original.rows[0]!.count);
    assert.equal(events.length,3);
  }finally{await db.close();}
});
test('audit failure rolls back comparison writes',{skip:!hasDatabase},async()=>{
  const db=new Database();const code='LAB-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
  try {
    const auth=await owner(db);
    const service=createComparisonCatalogService(db,{async record(){throw new Error('audit unavailable');}});
    await assert.rejects(service.create(auth,input(code)),/audit unavailable/);
    const found=await db.query<{count:string}>('SELECT count(*)::text AS count FROM commerce_lab.catalog_products WHERE code=$1',[code]);
    assert.equal(found.rows[0]!.count,'0');
  }finally{await db.close();}
});
