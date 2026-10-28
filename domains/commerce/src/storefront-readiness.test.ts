import assert from 'node:assert/strict';
import test from 'node:test';
import type { DatabasePort } from '@alsvid/database';
import { evaluateStorefrontReadiness, StorefrontReadinessService } from './storefront-readiness.js';

const fact = {
  sku_id:'11111111-1111-4111-8111-111111111111',sku:'FC1-BLK-DE',
  sku_name:'FC1 Black',model_code:'FC1',variant_code:'STANDARD',
  color_code:'BLACK',market_code:'DE',
  model_status:'ACTIVE',variant_status:'ACTIVE',sku_status:'ACTIVE',
  publication_status:'PUBLISHED',unit_price_gross:'2999.00',
  tax_rate_basis_points:1900,location_count:1,
  on_hand:'4.000000',reserved:'1.000000',available:'3.000000',
};
test('positive warehouse stock and active price NEVER enable checkout or auto reservation',()=>{
  const row=evaluateStorefrontReadiness(fact);
  assert.equal(row.ledgerAvailable,'3.000000');
  assert.equal(row.priceGross,'2999.00');
  assert.equal(row.checkoutEnabled,false);
  assert.equal(row.inventoryReservable,false);
  assert.ok(row.blockers.includes('CHANNEL_ALLOCATION_UNVERIFIED'));
  assert.ok(row.blockers.includes('TAX_SHIPPING_UNVERIFIED'));
  assert.ok(row.blockers.includes('PSP_NOT_CONFIGURED'));
});
test('missing data must not be falsified as zero stock; publish, price, market all block',()=>{
  const row=evaluateStorefrontReadiness({...fact,publication_status:'DRAFT',
    market_code:null,unit_price_gross:null,tax_rate_basis_points:null,
    location_count:0,on_hand:'0',reserved:'0',available:'0'});
  assert.equal(row.locationCount,0);
  assert.equal(row.ledgerAvailable,null);
  assert.equal(row.onHand,null);
  assert.deepEqual(row.blockers.slice(0,3),['MODEL_NOT_PUBLISHED','MARKET_SCOPE_UNVERIFIED','NO_ACTIVE_PRICE']);
  assert.ok(row.blockers.includes('NO_MARKET_STOCK_POSITION'));
});
test('zero available quantity blocks regardless of published model and active price',()=>{
  const row=evaluateStorefrontReadiness({...fact,available:'0.000000',on_hand:'2',reserved:'2'});
  assert.ok(row.blockers.includes('NO_LEDGER_AVAILABILITY'));
});
test('invalid or untrusted inventory decimal is unknown, not sellable',()=>{
  for(const v of ['-1','NaN','Infinity','1e9','not-a-number']){
    const row=evaluateStorefrontReadiness({...fact,available:v});
    assert.equal(row.ledgerAvailable,null);
    assert.ok(row.blockers.includes('NO_MARKET_STOCK_POSITION'));
  }
});
test('readiness requires BOTH commerce and inventory permissions before querying',async()=>{
  let queries=0;
  const db={query:async()=>{queries++;return {rows:[fact]};}} as unknown as DatabasePort;
  const service=new StorefrontReadinessService(db);
  await assert.rejects(service.summary({permissions:['commerce.storefront.read']},'DE'),
    {code:'COMMERCE_FORBIDDEN'});
  await assert.rejects(service.summary({permissions:['inventory.read']},'DE'),
    {code:'COMMERCE_FORBIDDEN'});
  assert.equal(queries,0);
  await assert.rejects(service.summary({permissions:['commerce.storefront.read','inventory.read']},'US'),
    /INVALID_STOREFRONT_MARKET/);
  assert.equal(queries,0);
});
test('market-specific query uses parameters, caps rows and flags cross-market SKUs',async()=>{
  let params:unknown[]=[];
  let statement='';
  const db={query:async(sql:string,values:unknown[])=>{
    statement=sql;params=values;return {rows:[fact,{...fact,sku_id:'22222222-2222-4222-8222-222222222222',market_code:'AT'}]};
  }} as unknown as DatabasePort;
  const service=new StorefrontReadinessService(db);
  const snapshot=await service.summary({permissions:['commerce.storefront.read','inventory.read']},'DE');
  assert.deepEqual(params,['DE']);
  assert.match(statement,/inventory\.v_availability/);
  assert.match(statement,/commerce\.storefront_prices/);
  assert.match(statement,/product\.catalog_publications/);
  assert.match(statement,/w\.country_code = \$1/);
  assert.equal(snapshot.checkoutEnabled,false);
  assert.equal(snapshot.market,'DE');
  assert.equal(snapshot.rows.length,2);
  assert.equal(snapshot.rows[0]?.blockers.includes('MARKET_SCOPE_UNVERIFIED'),false);
  assert.equal(snapshot.rows[1]?.blockers.includes('MARKET_SCOPE_UNVERIFIED'),true);
});
