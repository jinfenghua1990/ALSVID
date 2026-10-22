import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductService } from './application/product-service.js';
import { ProductValidationError } from './core/errors.js';
import type { ProductRepository, ProductAuditPort } from './application/ports.js';
import type { HomepageBinding } from './core/model.js';

const actor={userId:'system-operator',permissions:['product.read','product.write']};
const initial:HomepageBinding={
 slot_code:'FC1_HERO',target_model_code:'FC1',mode:'AUTO',manual_model_id:null,
 resolved_model_id:'fc1-id',resolved_model_code:'FC1',version:1,
};
function setup(valid=true){
 let row={...initial};
 const recorded:string[]=[];
 const repo={
  homepageBindings:async()=>[row],
  modelForHomepageSlot:async(slot:string,id:string)=>valid && slot==='FC1_HERO' && id==='fc1-id',
  homepageBindingExists:async()=>true,
  updateHomepageBinding:async(input:{slot:string;mode:string;modelId:string|null;expectedVersion:number})=>{
   if(input.expectedVersion!==row.version)return null;
   row={...row,mode:input.mode as 'AUTO'|'MANUAL',manual_model_id:input.modelId,version:row.version+1};
   return row;
  },
 } as unknown as ProductRepository;
 const audit:ProductAuditPort={record:async event=>{recorded.push(event.action);}};
 return {service:new ProductService(repo,audit),recorded};
}

test('homepage AUTO resolves only the repository verified model and public view omits admin detail',async()=>{
 const {service}=setup();
 const rows=await service.publicHomepageBindings();
 assert.deepEqual(rows,[{slot:'FC1_HERO',modelId:'fc1-id',modelCode:'FC1'}]);
 assert.equal('version' in rows[0],false);
 assert.equal('manual_model_id' in rows[0],false);
});

test('MANUAL binding requires matching active model and permission, with audit and version',async()=>{
 const {service,recorded}=setup();
 const saved=await service.setHomepageBinding(actor,{slot:'FC1_HERO',mode:'MANUAL',modelId:'fc1-id',expectedVersion:1});
 assert.equal(saved.version,2);
 assert.equal(saved.manual_model_id,'fc1-id');
 assert.deepEqual(recorded,['product.homepage_binding_updated']);
 await assert.rejects(
  ()=>service.setHomepageBinding(actor,{slot:'FC1_HERO',mode:'AUTO',expectedVersion:1}),
  /changed/
 );
});

test('wrong model ID never creates a homepage mismatch',async()=>{
 const {service}=setup(false);
 await assert.rejects(
  ()=>service.setHomepageBinding(actor,{slot:'FC1_HERO',mode:'MANUAL',modelId:'arbitrary',expectedVersion:1}),
  ProductValidationError
 );
});

test('model classification rejects accessory with a bicycle technical platform',async()=>{
 const {service}=setup();
 await assert.rejects(
  ()=>service.createModel(actor,{code:'RACK1',name:'Rack',productTypeCode:'ACCESSORY',platformId:'fc-platform'}),
  ProductValidationError
 );
 await assert.rejects(
  ()=>service.createModel(actor,{code:'FC1',name:'Bike',productTypeCode:'BIKE',platformId:null}),
  ProductValidationError
 );
});
