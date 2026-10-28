import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProductCode, ProductValidationError } from './index.js';

test('product codes normalize to stable uppercase identifiers', () => {
  assert.equal(normalizeProductCode(' fc1-pro '), 'FC1-PRO');
  assert.equal(normalizeProductCode('ct_1'), 'CT_1');
});

test('product codes reject spaces and punctuation', () => {
  assert.throws(() => normalizeProductCode('FC 1'), ProductValidationError);
  assert.throws(() => normalizeProductCode('FC1/PRO'), ProductValidationError);
});


test('SKU dimensions normalize color and size independently from SKU and Model identifiers',async()=>{
 const {normalizeSkuDimension}=await import('./index.js');
 assert.equal(normalizeSkuDimension(' graphite_black ','colorCode'),'GRAPHITE_BLACK');
 assert.equal(normalizeSkuDimension(' 20-inch ','sizeCode'),'20-INCH');
 assert.equal(normalizeSkuDimension('  ','colorCode'),null);
 assert.equal(normalizeSkuDimension(undefined,'sizeCode'),null);
 for(const input of ['BLACK/GRAY',' ', 'B'.repeat(33),'white grey']){
   if(input.trim()==='')continue;
   assert.throws(()=>normalizeSkuDimension(input,'colorCode'),ProductValidationError);
 }
});
