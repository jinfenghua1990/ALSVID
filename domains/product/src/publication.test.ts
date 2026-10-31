import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductValidationError } from './core/errors.js';
import {
 approvedCatalogAssets,assertPublicationTransition,curatedCatalogImage,mergeCatalogAssets,
 toPublicCatalogItem,validatePublicationDraft,type PublicationRow,
} from './core/publication.js';

test('publications are reviewed separately from ACTIVE internal product status',()=>{
 assert.equal(curatedCatalogImage('A1-ULTRA','ACTIVE','BIKE'),approvedCatalogAssets['A1-ULTRA']);
 assert.equal(curatedCatalogImage('L1-PRO','ACTIVE','BIKE'),approvedCatalogAssets['L1-PRO']);
 assert.throws(()=>curatedCatalogImage('CT1','ACTIVE','BIKE'),ProductValidationError);
 assert.throws(()=>curatedCatalogImage('A1-ULTRA','RETIRED','BIKE'),ProductValidationError);
 assert.equal(curatedCatalogImage('BASKET','ACTIVE','ACCESSORY',{BASKET:'/products/accessories/basket.webp'}),'/products/accessories/basket.webp');
 assert.throws(()=>curatedCatalogImage('BASKET','ACTIVE','ACCESSORY'),ProductValidationError);
});

test('draft requires complete zh/de/en review and material provenance evidence',()=>{
 assert.deepEqual(validatePublicationDraft({
  titleZh:'  A1 Ultra 整车 ',titleDe:' A1 Ultra Fahrrad ',titleEn:' A1 Ultra Bicycle ',evidenceNote:' actual product image checked ',
 }),{
  titleZh:'A1 Ultra 整车',titleDe:'A1 Ultra Fahrrad',titleEn:'A1 Ultra Bicycle',
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
 model_id:'valid-model-id',product_id:'100001',model_code:'A1-ULTRA',product_type_code:'BIKE',model_status:'ACTIVE',
 status:'PUBLISHED',title_zh:'A1 Ultra 整车',title_de:'A1 Ultra Fahrrad',title_en:'A1 Ultra Bicycle',
 image_path:approvedCatalogAssets['A1-ULTRA']!,evidence_note:'verified in product records',version:4,
 submitted_at:null,published_at:null,withdrawn_at:null,
};

test('public projection has only reviewed safe fields, never internal evidence/version',()=>{
 const projection=toPublicCatalogItem(row);
 assert.deepEqual(projection,{modelId:'valid-model-id',productId:'100001',code:'A1-ULTRA',type:'BIKE',
  image:approvedCatalogAssets['A1-ULTRA'],
  title:{zh:'A1 Ultra 整车',de:'A1 Ultra Fahrrad',en:'A1 Ultra Bicycle'}});
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
 const withFc3=mergeCatalogAssets([{model_code:'A1',image_path:'/products/fc3/side.webp',enabled:true}]);
 assert.equal(withFc3['A1'],'/products/fc3/side.webp');
 assert.equal(withFc3['A1-ULTRA'],approvedCatalogAssets['A1-ULTRA']);
 assert.equal(curatedCatalogImage('A1','ACTIVE','BIKE',withFc3),'/products/fc3/side.webp');
 // Replacing artwork for an existing model overrides the floor rather than appending.
 const replaced=mergeCatalogAssets([{model_code:'A1-ULTRA',image_path:'/products/fc1/v2.webp',enabled:true}]);
 assert.equal(replaced['A1-ULTRA'],'/products/fc1/v2.webp');
});

test('disabling a model withdraws it even though the floor still lists it',()=>{
 const withdrawn=mergeCatalogAssets([{model_code:'A1-ULTRA',image_path:approvedCatalogAssets['A1-ULTRA']!,enabled:false}]);
 assert.equal('A1-ULTRA' in withdrawn,false);
 assert.throws(()=>curatedCatalogImage('A1-ULTRA','ACTIVE','BIKE',withdrawn),ProductValidationError);
 assert.equal(toPublicCatalogItem(row,withdrawn),null);
 assert.equal(withdrawn['L1-PRO'],approvedCatalogAssets['L1-PRO']);
});

test('the allowlist merge never mutates its inputs and ignores unknown rows',()=>{
 const rows=[{model_code:'A1',image_path:'/products/fc3/side.webp',enabled:true}];
 const snapshot=JSON.stringify({rows,floor:approvedCatalogAssets});
 const merged=mergeCatalogAssets(rows.concat([{model_code:'',image_path:'/x.webp',enabled:true} as never]));
 assert.equal(JSON.stringify({rows,floor:approvedCatalogAssets}),snapshot);
 assert.equal(merged['A1'],'/products/fc3/side.webp');
 assert.equal('A1' in approvedCatalogAssets,false);
});

test('the public projection follows the allowlist, not the hardcoded pair',()=>{
 const fc3=mergeCatalogAssets([{model_code:'A1',image_path:'/products/fc3/side.webp',enabled:true}]);
 const projection=toPublicCatalogItem({...row,model_code:'A1',image_path:'/products/fc3/side.webp'},fc3);
 assert.deepEqual(projection,{modelId:'valid-model-id',productId:'100001',code:'A1',type:'BIKE',
  image:'/products/fc3/side.webp',title:{zh:'A1 Ultra 整车',de:'A1 Ultra Fahrrad',en:'A1 Ultra Bicycle'}});
 // An allowlisted model still cannot publish artwork that was not reviewed for it.
 assert.equal(toPublicCatalogItem({...row,model_code:'A1',image_path:'/products/fc2/side.webp'},fc3),null);
});
