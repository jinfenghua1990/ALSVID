import assert from 'node:assert/strict';
import test from 'node:test';
import {searchAuthorizedBusinessRecords} from './admin-business-search.ts';

const catalog={
 models:[{id:'m1',code:'FC1',name:'Folding Carbon'}],
 skus:[{id:'sku1',sku:'FC1-PRO-GRAY',name:'FC1 Pro Graphite'}],
};
const orders=[{orderNumber:'AL-2026-0001',customerEmail:'buyer@example.com',
 lines:[{skuCode:'FC1-PRO-GRAY',skuName:'FC1 Pro Graphite'}]}];

test('search real accessible model and SKU; return working prefiltered Admin links',()=>{
 const items=searchAuthorizedBusinessRecords(catalog,orders,'fc1');
 assert.deepEqual(items.map(i=>i.type),['model','sku','order']);
 assert.equal(items[0].href,'/admin/product?search=FC1#model-register');
 assert.equal(items[1].href,'/admin/product?search=FC1-PRO-GRAY#model-register');
 assert.equal(items[2].href,'/admin/orders?orderSearch=AL-2026-0001#b2c');
});

test('search case-insensitive order number and permitted customer email',()=>{
 const items=searchAuthorizedBusinessRecords(catalog,orders,'BUYER@EXAMPLE.COM');
 assert.deepEqual(items.map(i=>i.type),['order']);
 assert.equal(items[0].title,'AL-2026-0001');
});

test('never fake unavailable data sources or show short query results',()=>{
 assert.deepEqual(searchAuthorizedBusinessRecords(null,null,'fc1'),[]);
 assert.deepEqual(searchAuthorizedBusinessRecords(catalog,null,'al-2026'),[]);
 assert.deepEqual(searchAuthorizedBusinessRecords(null,orders,'fc1').map(i=>i.type),['order']);
 assert.deepEqual(searchAuthorizedBusinessRecords(catalog,orders,'F'),[]);
});

test('cap each record type and never mutate authorized snapshots',()=>{
 const larger={models:Array.from({length:15},(_,i)=>({id:String(i),code:'FC1-'+i,name:'FC1'})),skus:[]};
 const before=JSON.stringify(larger);
 assert.equal(searchAuthorizedBusinessRecords(larger,null,'FC1').length,8);
 assert.equal(JSON.stringify(larger),before);
});
