import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {Database} from '@alsvid/database';
import {createAuditService} from '@alsvid/audit';
import {createIdentityService} from '@alsvid/identity';
import {createAssetService} from '@alsvid/assets';
import {createComparisonCatalogService,CommerceConflictError,CommerceNotFoundError,CommerceValidationError} from '@alsvid/commerce';
import {ForbiddenError} from '@alsvid/kernel';
import type {ObjectStoragePort,PutObjectInput,StoredObjectMetadata} from '@alsvid/ports';
import {ComparisonMediaService,comparisonImageLimit} from '../src/comparison-media.js';

class Storage implements ObjectStoragePort{
  objects=new Map<string,{body:Uint8Array;type:string|null;checksum:string|null}>();
  putCalls=0;deleteCalls=0;lastExpiry=0;
  async put(input:PutObjectInput):Promise<StoredObjectMetadata>{
    assert.ok(input.body instanceof Uint8Array);this.putCalls++;
    const body=new Uint8Array(input.body);assert.ok(!this.objects.has(input.key));
    this.objects.set(input.key,{body,type:input.contentType,checksum:input.checksumSha256});
    return{key:input.key,size:body.byteLength,etag:'ci',contentType:input.contentType,checksumSha256:input.checksumSha256};
  }
  async head(key:string):Promise<StoredObjectMetadata|null>{
    const row=this.objects.get(key);return row?{key,size:row.body.byteLength,etag:'ci',contentType:row.type,checksumSha256:row.checksum}:null;
  }
  async delete(key:string){this.deleteCalls++;this.objects.delete(key);}
  async signedReadUrl(key:string,expiry:number){assert.ok(this.objects.has(key));this.lastExpiry=expiry;return'https://media.example.test/'+key;}
  async signedWriteUrl(){throw new Error('Direct write URLs are not used by this upload path');}
}
const enabled=process.env.GITHUB_ACTIONS==='true'&&Boolean(process.env.DATABASE_URL);
test('comparison images use Assets ownership and publication-gated access without changing publication state',{skip:!enabled},async()=>{
  const target=new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost','127.0.0.1'].includes(target.hostname));
  assert.equal(target.pathname,'/alsvid');
  const db=new Database(),audit=createAuditService(db),storage=new Storage();
  const catalog=createComparisonCatalogService(db,audit),assets=createAssetService(db,audit);
  try{
    const userId=await createIdentityService(db,audit).bootstrapAdmin('media-'+randomUUID()+'@example.test','MediaAcceptance123');
    const actor={userId,roles:['system_admin'],permissions:['commerce.read','commerce.map','asset.read','asset.write']};
    const media=new ComparisonMediaService(catalog,assets,{storage,provider:'r2',bucket:'ci-comparison-media'});
    const code='MEDIA-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
    const fields={title:{zh:'图片 CI',de:'Bild CI',en:'Image CI'},description:{zh:'',de:'',en:''},referenceImage:'FC1',proposedPriceMinor:null};
    const row=await catalog.create(actor,{code,...fields});
    assert.equal(row.hasCustomImage,false);
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
    await assert.rejects(media.upload({...actor,permissions:['commerce.read','commerce.map']},row.id,1,png,'image/png','ci.png'),ForbiddenError);
    await assert.rejects(media.upload(actor,row.id,2,png,'image/png','ci.png'),CommerceConflictError);
    await assert.rejects(media.upload(actor,row.id,1,Buffer.from('<html>'),'image/png','ci.png'),CommerceValidationError);
    await assert.rejects(media.upload(actor,row.id,1,png,'image/webp','ci.webp'),CommerceValidationError);
    await assert.rejects(media.upload(actor,row.id,1,Buffer.alloc(comparisonImageLimit+1),'image/png','ci.png'),CommerceValidationError);
    assert.equal(storage.putCalls,0);
    const uploaded=await media.upload(actor,row.id,1,png,'image/png',encodeURIComponent('产品图片.png'));
    assert.equal(uploaded.hasCustomImage,true);assert.equal(uploaded.version,2);assert.equal(uploaded.status,'DRAFT');
    const linked=await assets.forEntity(actor,'commerce_lab.catalog_product',row.id);
    assert.equal(linked.length,1);assert.equal(linked[0].classification,'PRODUCT_MEDIA');assert.equal(linked[0].purpose,'COVER');
    assert.equal(linked[0].original_filename,'产品图片.png');
    assert.ok(linked[0].object_key.startsWith('commerce-lab/products/'+row.id+'/'));
    await assert.rejects(media.read(row.id),CommerceNotFoundError);
    assert.ok((await media.read(row.id,actor)).startsWith('https://media.example.test/'));assert.equal(storage.lastExpiry,60);
    await assert.rejects(media.read(row.id,{...actor,permissions:['commerce.read']}),ForbiddenError);
    const published=await catalog.update(actor,row.id,{...fields,status:'PUBLISHED',expectedVersion:2});
    assert.equal(published.hasCustomImage,true);
    assert.ok(!JSON.stringify(published).includes(linked[0].object_key));
    assert.ok((await media.read(row.id)).startsWith('https://media.example.test/'));
    const removed=await media.remove(actor,row.id,3);
    assert.equal(removed.hasCustomImage,false);assert.equal(removed.version,4);assert.equal(removed.status,'PUBLISHED');
    await assert.rejects(media.read(row.id),CommerceNotFoundError);
    assert.equal(storage.deleteCalls,0,'removing a cover does not purge the uploaded object');
    const again=await media.upload(actor,row.id,4,png,'image/png','replacement.png');
    assert.equal(again.status,'PUBLISHED');assert.equal(again.version,5);assert.equal(storage.objects.size,2);
    await catalog.update(actor,row.id,{...fields,status:'DRAFT',expectedVersion:5});
    await assert.rejects(media.read(row.id),CommerceNotFoundError);
    assert.ok((await media.read(row.id,actor)).startsWith('https://media.example.test/'));
    const unavailable=new ComparisonMediaService(catalog,assets,null);
    await assert.rejects(unavailable.upload(actor,row.id,6,png,'image/png','ci.png'),/图片存储暂不可用/);
    const failing=new Storage();failing.put=async()=>{throw new Error('isolated storage outage');};
    await assert.rejects(new ComparisonMediaService(catalog,assets,{storage:failing,provider:'r2',bucket:'ci-comparison-media'})
      .upload(actor,row.id,6,png,'image/png','ci.png'),/图片上传暂时失败/);
    assert.equal((await catalog.adminProduct(actor,row.id)).version,6);
    assert.equal((await assets.forEntity(actor,'commerce_lab.catalog_product',row.id)).length,2);
    const recorded=await db.query<{count:number}>("SELECT count(*)::int AS count FROM audit.events WHERE target_id=$1 AND action='commerce.lab.product_image_changed'",[row.id]);
    assert.equal(recorded.rows[0]!.count,3);
  }finally{await db.close();}
});
