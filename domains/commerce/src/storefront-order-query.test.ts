import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStorefrontOrderFilter,
  resolveStorefrontOrderLimit,
  STOREFRONT_ORDER_PAGE_LIMIT,
  STOREFRONT_ORDER_MAX_LIMIT,
} from './storefront-orders.js';
import { CommerceValidationError } from './core/errors.js';

test('an unfiltered summary stays a plain unfiltered select', () => {
  for (const filters of [{}, { query: '', status: 'ALL', marketCountry: 'ALL' }, { query: '   ' }]) {
    assert.deepEqual(buildStorefrontOrderFilter(filters), { where: '', params: [] });
  }
});

test('status and market become bound parameters, never inline SQL', () => {
  const filter = buildStorefrontOrderFilter({ status: 'IN_PRODUCTION', marketCountry: 'at' });
  assert.equal(filter.where, 'WHERE o.status=$1 AND o.market_country=$2');
  assert.deepEqual(filter.params, ['IN_PRODUCTION', 'AT']);
});

test('an unknown status or market is rejected instead of returning zero rows', () => {
  assert.throws(() => buildStorefrontOrderFilter({ status: 'PAID' }), CommerceValidationError);
  assert.throws(() => buildStorefrontOrderFilter({ marketCountry: 'FR' }), CommerceValidationError);
});

test('the free-text term searches order number, buyer email and SKU snapshots', () => {
  const filter = buildStorefrontOrderFilter({ query: 'AL-2026' });
  assert.deepEqual(filter.params, ['%AL-2026%']);
  assert.match(filter.where, /o\.order_number ILIKE \$1/);
  assert.match(filter.where, /o\.customer_email ILIKE \$1/);
  assert.match(filter.where, /storefront_order_lines/);
});

test('LIKE wildcards in operator input are escaped', () => {
  assert.deepEqual(buildStorefrontOrderFilter({ query: '100%_x\\' }).params, ['%100\\%\\_x\\\\%']);
});

test('parameter numbering survives a combined filter', () => {
  const filter = buildStorefrontOrderFilter({ query: 'fc1', status: 'DRAFT', marketCountry: 'DE' });
  assert.deepEqual(filter.params, ['DRAFT', 'DE', '%fc1%']);
  assert.match(filter.where, /\$1/);
  assert.match(filter.where, /\$2/);
  assert.match(filter.where, /\$3/);
  assert.doesNotMatch(filter.where, /\$4/);
});

test('page size uses the default, clamps the maximum and rejects nonsense', () => {
  assert.equal(resolveStorefrontOrderLimit(undefined), STOREFRONT_ORDER_PAGE_LIMIT);
  assert.equal(resolveStorefrontOrderLimit(''), STOREFRONT_ORDER_PAGE_LIMIT);
  assert.equal(resolveStorefrontOrderLimit('25'), 25);
  assert.equal(resolveStorefrontOrderLimit(100000), STOREFRONT_ORDER_MAX_LIMIT);
  for (const bad of ['0', '-5', '1.5', 'abc']) {
    assert.throws(() => resolveStorefrontOrderLimit(bad), CommerceValidationError, bad);
  }
});

test('the filter never treats a non-object as an empty filter', () => {
  for (const bad of [null, 'status=DRAFT', ['DRAFT']]) {
    assert.throws(() => buildStorefrontOrderFilter(bad as never), CommerceValidationError);
  }
});
