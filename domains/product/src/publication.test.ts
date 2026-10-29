import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductValidationError } from './core/errors.js';
import {
 approvedCatalogAssets,assertPublicationTransition,curatedCatalogImage,mergeCatalogAssets,
 toPublicCatalogItem,validatePublicationDraft,type PublicationRow,
} from './core/publication.js';

test('publications are reviewed separately from ACTIVE internal product status',()=>{
 assert.equal(curatedCatalogImage('FC1','ACTIVE','BIKE'),approvedCatalogAssets.FC1);
 assert.equal(curatedCatalogImage('FC2','ACTIVE','BIKE'),approvedCatalogAssets.FC2);
 assert.throws(()=>curatedCatalogImage('CT1','ACTIVE','BIKE'),ProductValidationError);
 assert.throws(()=>curatedCatalogImage('FC1','RETIRED','BIKE'),ProductValidationError);
 assert.equal(curatedCatalogImage('BASKET','ACTIVE','ACCESSORY',{BASKET:'/products/accessories/basket.webp'}),'/products/accessories/basket.webp');
 assert.throws(()=>curatedCatalogImage('BASKET','ACTIVE','ACCESSORY'),ProductValidationError);
});

test('draft requires complete zh/de/en review and material provenance evidence',()=>{
 assert.deepEqual(validatePublicationDraft({
  titleZh:'  FC1 整车 ',titleDe:' FC1 Fahrrad ',titleEn:' FC1 Bicycle ',evidenceNote:' actual product image checked ',
 }),{
  titleZh:'FC1 整车',titleDe:'FC1 Fahrrad',titleEn:'FC1 Bicycle',
  evidenceNote:'actual product image checked',
 });
 assert.throws(()=>validatePublicationDraft({titleZh:'FC1',titleDe:'  ',titleEn:'FC1',evidenceNote:'reviewed'}),ProductValidationError);
 assert.throws(()=>validatePublicationDraft({titleZh:'FC1',titleDe:'FC1',titleEn:'FC1',evidenceNote:''}),ProductValidationError);
});

test('publication lifecycle rejects publishing draft, resubmitting review and duplicate withdrawal',()=>{
 assert.equal(assertPublicationTransition('DRAFT','SUBMIT'),'IN_REVIEW');
 assert.equal(assertPublicationTransition('IN_REVIEW','PUBLISH'),'PUBLISHED');
 assert.equal(assertPublicationTransition('PUBLISHED','WITHDRAW'),'WITHDRAWN');
 assert.equal(assertPublicationTransition('WITHDRAWN','SUBMIT'),'IN_REVIEW');
 assert.throws(()=>assertPublicationTransition('DRAFT','PUBLISH'),ProductValidationError);
 assert.throws(()=>assertPublicationTransition('IN_REVIEW','SUBMIT'),ProductValidationError);
 assert.throws(()=>assertPublicationTransition('WITHDRAWN','WITHDRAW'),ProductValidationError);
});

const row:PublicationRow={
 model_id:'valid-model-id',model_code:'FC1',product_type_code:'BIKE',model_status:'ACTIVE',
 status:'PUBLISHED',title_zh:'FC1 整车',title_de:'FC1 Fahrrad',title_en:'FC1 Bicycle',
 image_path:approvedCatalogAssets.FC1!,evidence_note:'verified in product records',version:4,
 submitted_at:null,published_at:null,withdrawn_at:null,
};

test('public projection has only reviewed safe fields, never internal evidence/version',()=>{
 const projection=toPublicCatalogItem(row);
 assert.deepEqual(projection,{modelId:'valid-model-id',code:'FC1',type:'BIKE',
  image:approvedCatalogAssets.FC1,
  title:{zh:'FC1 整车',de:'FC1 Fahrrad',en:'FC1 Bicycle'}});
 assert.equal('evidence_note' in (projection??{}),false);
 assert.equal(toPublicCatalogItem({...row,status:'DRAFT'}),null);
 assert.equal(toPublicCatalogItem({...row,status:'WITHDRAWN'}),null);
 assert.equal(toPublicCatalogItem({...row,model_status:'RETIRED'}),null);
 assert.equal(toPublicCatalogItem({...row,image_path:'/incorrect-bike.webp'}),null);
});

test('the reviewed artwork allowlist is data, with the built-in list as a floor',()=>{
 // No overrides yet: the floor keeps today's behaviour exactly.
 assert.deepEqual(mergeCatalogAssets([]),approvedCatalogAssets);
 // A new model becomes publishable without touching code.
 const withFc3=mergeCatalogAssets([{model_code:'FC3',image_path:'/products/fc3/side.webp',enabled:true}]);
 assert.equal(withFc3.FC3,'/products/fc3/side.webp');
 assert.equal(withFc3.FC1,approvedCatalogAssets.FC1);
 assert.equal(curatedCatalogImage('FC3','ACTIVE','BIKE',withFc3),'/products/fc3/side.webp');
 // Replacing artwork for an existing model overrides the floor rather than appending.
 const replaced=mergeCatalogAssets([{model_code:'FC1',image_path:'/products/fc1/v2.webp',enabled:true}]);
 assert.equal(replaced.FC1,'/products/fc1/v2.webp');
});

test('disabling a model withdraws it even though the floor still lists it',()=>{
 const withdrawn=mergeCatalogAssets([{model_code:'FC1',image_path:approvedCatalogAssets.FC1!,enabled:false}]);
 assert.equal('FC1' in withdrawn,false);
 assert.throws(()=>curatedCatalogImage('FC1','ACTIVE','BIKE',withdrawn),ProductValidationError);
 assert.equal(toPublicCatalogItem(row,withdrawn),null);
 assert.equal(withdrawn.FC2,approvedCatalogAssets.FC2);
});

test('the allowlist merge never mutates its inputs and ignores unknown rows',()=>{
 const rows=[{model_code:'FC3',image_path:'/products/fc3/side.webp',enabled:true}];
 const snapshot=JSON.stringify({rows,floor:approvedCatalogAssets});
 const merged=mergeCatalogAssets(rows.concat([{model_code:'',image_path:'/x.webp',enabled:true} as never]));
 assert.equal(JSON.stringify({rows,floor:approvedCatalogAssets}),snapshot);
 assert.equal(merged.FC3,'/products/fc3/side.webp');
 assert.equal('FC3' in approvedCatalogAssets,false);
});

test('the public projection follows the allowlist, not the hardcoded pair',()=>{
 const fc3=mergeCatalogAssets([{model_code:'FC3',image_path:'/products/fc3/side.webp',enabled:true}]);
 const projection=toPublicCatalogItem({...row,model_code:'FC3',image_path:'/products/fc3/side.webp'},fc3);
 assert.deepEqual(projection,{modelId:'valid-model-id',code:'FC3',type:'BIKE',
  image:'/products/fc3/side.webp',title:{zh:'FC1 整车',de:'FC1 Fahrrad',en:'FC1 Bicycle'}});
 // An allowlisted model still cannot publish artwork that was not reviewed for it.
 assert.equal(toPublicCatalogItem({...row,model_code:'FC3',image_path:'/products/fc2/side.webp'},fc3),null);
});
