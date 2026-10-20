import assert from 'node:assert/strict';
import test from 'node:test';
import { portalHostFor, portalUrlFor } from './portal-routing.ts';

test('legacy production hosts generate canonical ALSVID portal hosts', () => {
  assert.equal(portalHostFor('www.chaibenn.com', 'my'), 'my.alsvidbike.com');
  assert.equal(portalHostFor('my.chaibenn.com', 'my'), 'my.alsvidbike.com');
  assert.equal(portalHostFor('admin.chaibenn.com', 'dealer'), 'dealer.alsvidbike.com');
  assert.equal(portalHostFor('www.alsvidbike.com', 'my'), 'my.alsvidbike.com');
  assert.equal(portalUrlFor('www.chaibenn.com', 'my'), 'https://my.alsvidbike.com');
});

test('local development keeps portal navigation on the local app', () => {
  assert.equal(portalUrlFor('localhost:3000', 'my'), 'http://localhost:3000/my');
  assert.equal(portalUrlFor('127.0.0.1:3000', 'dealer'), 'http://127.0.0.1:3000/dealer');
  assert.equal(portalUrlFor('0.0.0.0:3000', 'www'), 'http://0.0.0.0:3000/');
  assert.equal(new URL('/my/vehicles', portalUrlFor('localhost:3000', 'my')).toString(), 'http://localhost:3000/my/vehicles');
});

test('legacy and retired development hosts never generate non-canonical links', () => {
  assert.equal(portalHostFor('www.dev.chaibenn.com', 'my'), 'my.alsvidbike.com');
  assert.equal(portalHostFor('www.dev.alsvid.com', 'my'), 'my.alsvidbike.com');
  assert.equal(portalUrlFor('www.dev.chaibenn.com', 'my'), 'https://my.alsvidbike.com');
});
