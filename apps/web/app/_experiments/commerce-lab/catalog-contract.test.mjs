import assert from 'node:assert/strict';
import test from 'node:test';
import {parseLabProducts,parseAdminLabProduct} from './catalog-contract.ts';
const row={id:'00000000-0000-4000-8000-000000000001',code:'FC1',
 title:{zh:'参考 FC1',de:'FC1 Referenz',en:'FC1 reference'},description:{zh:'',de:'',en:''},
 referenceImage:'FC1',proposedPriceMinor:null,currency:'EUR',status:'PUBLISHED',version:1,updatedAt:'2026-10-26T00:00:00Z'};
const payload=items=>({data:{items,total:items.length}});
test('public comparison contract keeps only published display data, including genuine empty catalogs',()=>{
 assert.deepEqual(parseLabProducts(payload([])),{products:[],total:0});
 const parsed=parseLabProducts(payload([{...row,created_by:'private-author',password:'must-not-pass'}]));
 assert.deepEqual(parsed,{products:[row],total:1});
 assert.ok(!JSON.stringify(parsed).includes('private-author'));
});
test('bad status, prices, duplicates and malformed responses fail closed',()=>{
 for(const input of [
  payload([{...row,status:'DRAFT'}]),payload([{...row,proposedPriceMinor:0.1}]),payload([{...row,title:{zh:'only'}}]),
  payload([{...row,referenceImage:'https://untrusted.invalid/image'}]),payload([row,row]),
  {data:{items:[row],total:0}},payload([{...row,updatedAt:'invalid'}]),{data:{items:{},total:0}}
 ])assert.throws(()=>parseLabProducts(input));
});

test('private draft parsing is explicit and never relaxes public publication rules',()=>{
 const draft={...row,status:'DRAFT'};
 assert.equal(parseAdminLabProduct({data:draft}).status,'DRAFT');
 assert.equal(parseAdminLabProduct({data:{...row,status:'ARCHIVED'}}).status,'ARCHIVED');
 assert.throws(()=>parseLabProducts(payload([draft])));
 const parsed=parseAdminLabProduct({data:{...draft,created_by:'private-author',password:'must-not-pass'}});
 assert.deepEqual(parsed,draft);
 assert.ok(!JSON.stringify(parsed).includes('private-author'));
 for(const bad of [{...row,status:'UNKNOWN'},{...row,title:{zh:'',de:'',en:''}},{...row,id:'invalid'}])
  assert.throws(()=>parseAdminLabProduct({data:bad}));
});
