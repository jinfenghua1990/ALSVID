import {createHash,randomUUID} from 'node:crypto';
import {ServiceUnavailableException} from '@nestjs/common';
import {ForbiddenError} from '@alsvid/kernel';
import type {AssetService,AssetActor,PublicAssetMediaReference} from '@alsvid/assets';
import {CommerceValidationError,CommerceNotFoundError,type ComparisonCatalogService} from '@alsvid/commerce';
import type {ObjectStoragePort} from '@alsvid/ports';

export const comparisonImageLimit=5*1024*1024;
export const comparisonImageTypes=['image/jpeg','image/png','image/webp'] as const;
export interface MediaActor extends AssetActor {roles:readonly string[]}
export interface ComparisonStorage {storage:ObjectStoragePort;provider:string;bucket:string}
type ImageType=typeof comparisonImageTypes[number];
function detectedType(body:Buffer):ImageType|null{
  if(body.length>=33&&body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&
    body.toString('ascii',12,16)==='IHDR'&&body.readUInt32BE(16)>0&&body.readUInt32BE(20)>0&&
    body.readUInt32BE(16)*body.readUInt32BE(20)<=40000000)return'image/png';
  if(body.length>=16&&body[0]===255&&body[1]===216&&body[2]===255&&body[body.length-2]===255&&body[body.length-1]===217)return'image/jpeg';
  if(body.length>=20&&body.toString('ascii',0,4)==='RIFF'&&body.toString('ascii',8,12)==='WEBP'&&
    body.readUInt32LE(4)===body.length-8)return'image/webp';
  return null;
}
function checkedImage(value:unknown,contentType:string):{body:Buffer;type:ImageType;checksum:string}{
  if(!(value instanceof Uint8Array)||value.byteLength<1||value.byteLength>comparisonImageLimit)
    throw new CommerceValidationError('Image must be between 1 byte and 5 MiB');
  const body=Buffer.from(value),type=detectedType(body);
  if(!type||type!==contentType.split(';')[0]?.trim().toLowerCase())throw new CommerceValidationError('Upload a valid JPEG, PNG or WebP image');
  return{body,type,checksum:createHash('sha256').update(body).digest('hex')};
}
function filename(value:string):string{
  let result:string;try{result=decodeURIComponent(value);}catch{throw new CommerceValidationError('Invalid image filename');}
  result=result.replace(/[/\\\x00-\x1f]/g,'_').trim();
  if(!result||result.length>180)throw new CommerceValidationError('Invalid image filename');
  return result;
}
export class ComparisonMediaService{
  constructor(private readonly catalog:ComparisonCatalogService,private readonly assets:AssetService,
    private readonly binding:ComparisonStorage|null){}
  private configured():ComparisonStorage{
    if(!this.binding)throw new ServiceUnavailableException('图片存储暂不可用，请稍后重试');
    return this.binding;
  }
  async upload(actor:MediaActor,id:string,expectedVersion:number,value:unknown,contentType:string,originalFilename:string){
    await this.catalog.imageTarget(actor,id,expectedVersion);
    if(!actor.permissions.includes('asset.write'))throw new ForbiddenError('COMPARISON_MEDIA_FORBIDDEN','Image upload permission is required');
    const image=checkedImage(value,contentType),name=filename(originalFilename),binding=this.configured();
    const extension=image.type==='image/jpeg'?'jpg':image.type==='image/png'?'png':'webp';
    const key='commerce-lab/products/'+id+'/'+randomUUID()+'.'+extension;
    let stored;
    try{stored=await binding.storage.put({key,body:image.body,contentType:image.type,checksumSha256:image.checksum,
      metadata:{'product-id':id,'purpose':'comparison-cover'}});}
    catch{throw new ServiceUnavailableException('图片上传暂时失败，请稍后重试');}
    if(stored.key!==key||stored.size!==image.body.byteLength||stored.contentType!==image.type||stored.checksumSha256!==image.checksum)
      throw new ServiceUnavailableException('无法核验已上传图片，请重试');
    const asset=await this.assets.register(actor,{provider:binding.provider,bucket:binding.bucket,objectKey:key,
      checksumSha256:image.checksum,contentType:image.type,byteSize:image.body.byteLength,originalFilename:name,
      visibility:'PUBLIC',classification:'PRODUCT_MEDIA',metadata:{purpose:'COMPARISON_COVER',productId:id}});
    await this.assets.link(actor,asset.id,{entityType:'commerce_lab.catalog_product',entityId:id,purpose:'COVER'});
    return this.catalog.setImage(actor,id,expectedVersion,asset.id);
  }
  async remove(actor:MediaActor,id:string,expectedVersion:number){
    return this.catalog.setImage(actor,id,expectedVersion,null);
  }
  async read(id:string,actor?:MediaActor):Promise<string>{
    const reference=await this.catalog.imageReference(id,actor);
    let asset:PublicAssetMediaReference|null;
    if(actor){
      const linked=await this.assets.forEntity(actor,'commerce_lab.catalog_product',id);
      const row=linked.find(value=>value.id===reference.assetId&&value.purpose==='COVER'&&value.classification==='PRODUCT_MEDIA');
      asset=row?{id:row.id,provider:row.provider,bucket:row.bucket,objectKey:row.object_key,contentType:row.content_type,
        byteSize:row.byte_size===null?null:Number(row.byte_size)}:null;
    }else asset=await this.assets.publicLinkedMedia(reference.assetId,'commerce_lab.catalog_product',id);
    if(!asset)throw new CommerceNotFoundError('Comparison image not found');
    const binding=this.configured();
    if(asset.provider!==binding.provider||asset.bucket!==binding.bucket||
      !new RegExp('^commerce-lab/products/'+id+'/[a-f0-9-]{36}\\.(png|jpg|webp)$','i').test(asset.objectKey)||
      !comparisonImageTypes.includes(asset.contentType as ImageType))throw new CommerceNotFoundError('Comparison image not found');
    try{
      const url=await binding.storage.signedReadUrl(asset.objectKey,60);
      const parsed=new URL(url);
      if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('Invalid media URL');
      return url;
    }catch{throw new ServiceUnavailableException('图片暂时无法读取，请稍后重试');}
  }
}
