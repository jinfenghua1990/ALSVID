import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveStorefrontOrderTarget,
  storefrontOrderHref,
  storefrontOrderIdParam,
} from './storefront-order-target.ts';

const ORDER_ID = '5b0f2c1e-7a3d-4c8e-9f10-2d4b6a8c0e11';
const OTHER_ID = '9c8b7a65-4321-4fed-8cba-0987654321fe';

const orders = [{ id: ORDER_ID, orderNumber: 'AL-2026-0007' }];

test('a valid orderId already in the loaded page selects that order', () => {
  const target = resolveStorefrontOrderTarget(orders, '?orderId=' + ORDER_ID);
  assert.equal(target.status, 'selected');
  assert.equal(target.orderId, ORDER_ID);
  assert.equal(target.query, '');
});

test('orderId matching is case insensitive and whitespace tolerant', () => {
  const target = resolveStorefrontOrderTarget(orders, '?orderId=%20' + ORDER_ID.toUpperCase() + '%20');
  assert.equal(target.status, 'selected');
  assert.equal(target.orderId, ORDER_ID);
});

test('an unknown or malformed orderId is missing, never another order', () => {
  for (const search of ['?orderId=' + OTHER_ID, '?orderId=not-a-uuid', '?orderId=' + ORDER_ID.slice(0, 8)]) {
    const target = resolveStorefrontOrderTarget(orders, search);
    assert.equal(target.status, 'missing', search);
    assert.equal(target.orderId, null);
  }
});

test('orderSearch falls back to a trimmed bounded text search', () => {
  const target = resolveStorefrontOrderTarget(orders, '?orderSearch=%20AL-2026-0007%20');
  assert.equal(target.status, 'search');
  assert.equal(target.query, 'AL-2026-0007');
  assert.equal(target.orderId, null);
});

test('no recognised parameter is a plain, unstyled visit', () => {
  for (const search of ['', '?', '?utm_source=mail', '?orderId=']) {
    const target = resolveStorefrontOrderTarget(orders, search);
    assert.equal(target.status, 'default', search);
  }
});

test('orderId wins over a stale orderSearch in the same link', () => {
  const target = resolveStorefrontOrderTarget(orders, '?orderSearch=AL-1&orderId=' + ORDER_ID);
  assert.equal(target.status, 'selected');
  assert.equal(target.orderId, ORDER_ID);
});

test('href always targets the first-party order workspace', () => {
  assert.equal(storefrontOrderHref({ id: ORDER_ID, orderNumber: 'AL-2026-0007' }),
    '/admin/ecommerce/orders?orderId=' + ORDER_ID);
  assert.equal(storefrontOrderHref({ id: 'bad-id', orderNumber: 'AL 2026/7' }),
    '/admin/ecommerce/orders?orderSearch=AL%202026%2F7');
});

test('id param helper rejects non-UUID input', () => {
  assert.equal(storefrontOrderIdParam(null), null);
  assert.equal(storefrontOrderIdParam('  '), null);
  assert.equal(storefrontOrderIdParam('AL-2026-0007'), null);
  assert.equal(storefrontOrderIdParam(ORDER_ID), ORDER_ID);
});
