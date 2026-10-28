import assert from 'node:assert/strict';
import test from 'node:test';
import {findActiveSkuCombinationDuplicates} from './sku-combination-audit.ts';

const row=(id,variant_id,sku,market_code,color_code,size_code,status='ACTIVE')=>({
 id,variant_id,sku,market_code,color_code,size_code,status,
});
test('catalog audit detects legacy duplicate dimensions without conflating variants or retired SKUs',()=>{
 const collisions=findActiveSkuCombinationDuplicates([
  row('1','v1','SKU-A','DE','Black','20'),
  row('2','v1','SKU-B','DE',' BLACK ','20'),
  row('3','v2','SKU-C','DE','BLACK','20'),
  row('4','v1','SKU-D','DE','BLACK','20','RETIRED'),
  row('5','v1','SKU-E',null,null,null),
  row('6','v1','SKU-F',null,null,null),
  row('7','v1','SKU-G','AT','BLACK','20'),
 ]);
 assert.equal(collisions.length,1);
 assert.deepEqual(collisions[0],{variantId:'v1',market:'DE',color:'BLACK',size:'20',skus:['SKU-A','SKU-B']});
});
test('real unique colors and incomplete legacy dimensions remain separately auditable',()=>{
 assert.deepEqual(findActiveSkuCombinationDuplicates([
  row('1','v1','A','DE','BLACK',null),
  row('2','v1','B','DE','GRAY',null),
 ]),[]);
});
