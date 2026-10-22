import assert from 'node:assert/strict';
import test from 'node:test';
import { adminSkuPricingHref, resolveAdminPricingTarget } from './admin-sku-pricing-navigation.ts';

const skus = [{ id: 'sku-1' }, { id: 'sku-2' }];

test('each SKU links to the same Admin Commerce editor but selects its own ID and supported market', () => {
  assert.equal(adminSkuPricingHref({ id: 'sku-1', market_code: 'AT' }), '/admin/orders?skuId=sku-1&market=AT#b2c');
  assert.equal(adminSkuPricingHref({ id: 'sku-2', market_code: 'DE' }), '/admin/orders?skuId=sku-2&market=DE#b2c');
  assert.equal(adminSkuPricingHref({ id: 'sku-1', market_code: 'EU' }), '/admin/orders?skuId=sku-1#b2c');
});

test('valid deep link preselects exactly the SKU found in authorized API data', () => {
  assert.deepEqual(resolveAdminPricingTarget(skus,'?skuId=sku-2&market=AT'),
    { skuId:'sku-2', market:'AT', status:'selected' });
  assert.deepEqual(resolveAdminPricingTarget(skus,'?skuId=sku-1&market=DE'),
    { skuId:'sku-1', market:'DE', status:'selected' });
});

test('invalid or unknown SKU must not silently substitute another price target', () => {
  assert.deepEqual(resolveAdminPricingTarget(skus,'?skuId=unknown&market=AT'),
    {skuId:'',market:'AT',status:'missing'});
  assert.deepEqual(resolveAdminPricingTarget(skus,'?skuId='),
    {skuId:'',market:'DE',status:'missing'});
});

test('direct order visit keeps the original default while unrecognized market does not grant additional choices', () => {
  assert.deepEqual(resolveAdminPricingTarget(skus,''),
    {skuId:'sku-1',market:'DE',status:'default'});
  assert.deepEqual(resolveAdminPricingTarget(skus,'?skuId=sku-2&market=US'),
    {skuId:'sku-2',market:'DE',status:'selected'});
  assert.deepEqual(resolveAdminPricingTarget([],''),{skuId:'',market:'DE',status:'default'});
});
