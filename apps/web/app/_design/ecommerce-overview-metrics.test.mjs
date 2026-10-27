import assert from 'node:assert/strict';
import test from 'node:test';
import { computeEcommerceOverview, ECOMMERCE_SKU_SNAPSHOT_LIMIT } from './ecommerce-overview-metrics.ts';

const base = {
  skus: [{ id: 'sku-1' }, { id: 'sku-2' }, { id: 'sku-3' }],
  prices: [
    { skuId: 'sku-1', status: 'ACTIVE' },
    { skuId: 'sku-2', status: 'DRAFT' },
    { skuId: 'sku-3', status: 'RETIRED' },
  ],
  orderStatusCounts: { DRAFT: 4, SUBMITTED: 2, IN_PRODUCTION: 1, FULFILLMENT_PENDING: 3 },
  orderTotal: 10,
};

const metric = (metrics, key) => metrics.find(item => item.key === key);

test('order counts come from the whole-book distribution, not the loaded page', () => {
  const metrics = computeEcommerceOverview(base);
  assert.equal(metric(metrics, 'orders-total').value, 10);
  assert.equal(metric(metrics, 'orders-draft').value, 4);
  assert.equal(metric(metrics, 'orders-submitted').value, 2);
  assert.equal(metric(metrics, 'orders-production').value, 1);
  assert.equal(metric(metrics, 'orders-fulfillment').value, 3);
});

test('a SKU counts as sellable only with an ACTIVE price version', () => {
  const metrics = computeEcommerceOverview(base);
  assert.equal(metric(metrics, 'skus-unpriced').value, 2);
  assert.equal(metric(metrics, 'price-drafts').value, 1);
  assert.equal(metric(metrics, 'skus-unpriced').tone, 'blocked');
});

test('missing statuses and an empty book report zero instead of NaN', () => {
  const metrics = computeEcommerceOverview({
    skus: [], prices: [], orderStatusCounts: {}, orderTotal: 0,
  });
  for (const item of metrics) assert.equal(item.value, 0, item.key);
  assert.equal(metric(metrics, 'skus-unpriced').tone, 'neutral');
  assert.equal(metric(metrics, 'orders-submitted').tone, 'neutral');
});

test('unknown statuses are ignored rather than merged into another bucket', () => {
  const metrics = computeEcommerceOverview({
    ...base, orderStatusCounts: { DRAFT: 1, SOMETHING_ELSE: 99 },
  });
  assert.equal(metric(metrics, 'orders-draft').value, 1);
  assert.equal(metric(metrics, 'orders-total').value, 10);
});

test('a saturated SKU snapshot is disclosed as a lower bound', () => {
  const saturated = {
    ...base,
    skus: Array.from({ length: ECOMMERCE_SKU_SNAPSHOT_LIMIT }, (_, index) => ({ id: 'sku-' + index })),
  };
  const metrics = computeEcommerceOverview(saturated);
  assert.match(metric(metrics, 'skus-unpriced').hint, /下限/);
  assert.doesNotMatch(metric(computeEcommerceOverview(base), 'skus-unpriced').hint, /下限/);
});

test('computation is read-only and never mutates the API snapshot', () => {
  const snapshot = JSON.stringify(base);
  computeEcommerceOverview(base);
  assert.equal(JSON.stringify(base), snapshot);
});
