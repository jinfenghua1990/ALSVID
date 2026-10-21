import assert from 'node:assert/strict';
import test from 'node:test';
import { filterStorefrontOrders } from './storefront-order-filter.ts';

const orders = [
  { orderNumber: 'AL-100', customerEmail: 'owner@example.com', status: 'DRAFT', marketCountry: 'DE',
    lines: [{skuCode: 'FC1-BLACK',skuName: 'FC1 Carbon'}] },
  { orderNumber: 'AL-101', customerEmail: 'buyer@example.com', status: 'CANCELLED', marketCountry: 'AT',
    lines: [{skuCode: 'RACK-01',skuName: 'Rear Rack'}] },
];

test('filter by order number, buyer email and product SKU without case sensitivity', () => {
  for (const query of ['al-100', 'OWNER@EXAMPLE.COM', 'fc1-black', 'CARBON']) {
    assert.deepEqual(filterStorefrontOrders(orders, {query, status:'ALL', market:'ALL'}).map(order=>order.orderNumber), ['AL-100']);
  }
});

test('combine country and status filters; empty query does not hide orders', () => {
  assert.deepEqual(filterStorefrontOrders(orders, {query:' ', status:'DRAFT', market:'DE'}).map(o=>o.orderNumber), ['AL-100']);
  assert.deepEqual(filterStorefrontOrders(orders, {query:' ', status:'DRAFT', market:'AT'}), []);
  assert.equal(filterStorefrontOrders(orders, {query:'', status:'ALL', market:'ALL'}).length, 2);
});

test('filter is read-only and does not mutate API order snapshot', () => {
  const snapshot = JSON.stringify(orders);
  filterStorefrontOrders(orders, {query:'rack', status:'ALL', market:'ALL'});
  assert.equal(JSON.stringify(orders), snapshot);
});
