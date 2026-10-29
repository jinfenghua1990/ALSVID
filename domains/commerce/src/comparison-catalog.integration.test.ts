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
    assert.equal((await service.adminProduct(auth,created.id)).status,'DRAFT');
    await assert.rejects(service.adminProduct({...auth,roles:['dealer_user']},created.id),ForbiddenError);
    await assert.rejects(service.adminProduct({...auth,permissions:['commerce.map']},created.id),ForbiddenError);
    await assert.rejects(service.adminProduct(auth,randomUUID()),CommerceNotFoundError);
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
    assert.equal((await service.adminProduct(auth,created.id)).status,'ARCHIVED');
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

test('ordered specifications persist and publication-only older updates never erase them',{skip:!hasDatabase},async()=>{
  const db=new Database();const code='SPEC-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
  try{
    const auth=await owner(db),service=createComparisonCatalogService(db,noopAudit);
    const spec={label:{zh:'电池容量',de:'Akkukapazität',en:'Battery capacity'},value:{zh:'768 Wh',de:'768 Wh',en:'768 Wh'},featured:true};
    const second={label:{zh:'扭矩',de:'Drehmoment',en:'Torque'},value:{zh:'90 Nm',de:'90 Nm',en:'90 Nm'},featured:false};
    const row=await service.create(auth,{...input(code),specifications:[spec,second]});
    assert.deepEqual(row.specifications,[spec,second]);
    const base={title:row.title,description:row.description,referenceImage:row.referenceImage,proposedPriceMinor:null};
    await service.update(auth,row.id,{...base,status:'DRAFT',expectedVersion:1,specifications:[second,spec]});
    const published=await service.update(auth,row.id,{...base,status:'PUBLISHED',expectedVersion:2});
    assert.deepEqual(published.specifications,[second,spec],'omitting the field preserves existing parameters');
    assert.deepEqual((await service.publicProduct(row.id)).specifications,[second,spec]);
    const actual=await db.query<{specifications:unknown}>('SELECT specifications FROM commerce_lab.catalog_products WHERE id=$1',[row.id]);
    assert.deepEqual(actual.rows[0]!.specifications,[second,spec]);
    await assert.rejects(service.update(auth,row.id,{...base,status:'PUBLISHED',expectedVersion:2,specifications:[]}),CommerceConflictError);
    assert.deepEqual((await service.adminProduct(auth,row.id)).specifications,[second,spec]);
    await service.update(auth,row.id,{...base,status:'PUBLISHED',expectedVersion:3,specifications:[]});
    assert.deepEqual((await service.publicProduct(row.id)).specifications,[],'explicit empty array clears the section');
  }finally{await db.close();}
});

test('comparison search treats underscores, percent signs and backslashes as literal text',{skip:!hasDatabase},async()=>{
  const db=new Database();const tag='LIT'+randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
  try{
    const auth=await owner(db),service=createComparisonCatalogService(db,noopAudit);
    const create=(suffix:string,title:string)=>service.create(auth,{...input(tag+suffix),
      title:{zh:title,de:'Referenz',en:'Reference'}});
    const under=await create('_X',tag+' under_score'),underOther=await create('AX',tag+' underXscore');
    const percent=await create('-P',tag+' 50%');await create('-Q',tag+' 500');
    const slash=await create('-S',tag+' A\\B');await create('-T',tag+' AB');
    async function ids(query:string){return (await service.adminList(auth,{query})).items.map(row=>row.id);}
    assert.deepEqual(await ids(tag+'_X'),[under.id],'underscore in a product code is not a single-character wildcard');
    assert.deepEqual(await ids(tag+' 50%'),[percent.id],'percent in a title is not a multi-character wildcard');
    assert.deepEqual(await ids(tag+' A\\B'),[slash.id],'backslash in a title is matched literally');
    assert.deepEqual(await ids(tag+' under_score'),[under.id],'underscore in a title is matched literally');
    assert.deepEqual(await ids(tag.toLowerCase()+'ax'),[underOther.id],'ordinary search remains case-insensitive');
    assert.equal((await service.publicList({query:tag+'_X'})).total,0,'drafts remain hidden');
    await service.update(auth,under.id,{title:under.title,description:under.description,referenceImage:under.referenceImage,
      proposedPriceMinor:under.proposedPriceMinor,status:'PUBLISHED',expectedVersion:under.version});
    assert.deepEqual((await service.publicList({query:tag+'_X'})).items.map(row=>row.id),[under.id]);
  }finally{await db.close();}
});
