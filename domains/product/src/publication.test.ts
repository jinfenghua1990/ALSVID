import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductValidationError } from './core/errors.js';
import {
 approvedCatalogAssets,assertPublicationTransition,curatedCatalogImage,
 toPublicCatalogItem,validatePublicationDraft,type PublicationRow,
} from './core/publication.js';

test('publications are reviewed separately from ACTIVE internal product status',()=>{
 assert.equal(curatedCatalogImage('FC1','ACTIVE','BIKE'),approvedCatalogAssets.FC1);
 assert.equal(curatedCatalogImage('FC2','ACTIVE','BIKE'),approvedCatalogAssets.FC2);
 assert.throws(()=>curatedCatalogImage('CT1','ACTIVE','BIKE'),ProductValidationError);
 assert.throws(()=>curatedCatalogImage('FC1','RETIRED','BIKE'),ProductValidationError);
 assert.throws(()=>curatedCatalogImage('FC1','ACTIVE','ACCESSORY'),ProductValidationError);
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
 image_path:approvedCatalogAssets.FC1,evidence_note:'verified in product records',version:4,
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
