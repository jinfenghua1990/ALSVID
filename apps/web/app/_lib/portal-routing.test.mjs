import assert from 'node:assert/strict';
import test from 'node:test';
import { portalHostFor, portalUrlFor } from './portal-routing.ts';

test('legacy production hosts generate canonical ALSVID portal hosts', () => {
  assert.equal(portalHostFor('www.chaibenn.com', 'my'), 'my.alsvid.com');
  assert.equal(portalHostFor('my.chaibenn.com', 'my'), 'my.alsvid.com');
  assert.equal(portalHostFor('admin.chaibenn.com', 'dealer'), 'dealer.alsvid.com');
  assert.equal(portalHostFor('www.alsvid.com', 'my'), 'my.alsvid.com');
  assert.equal(portalUrlFor('www.chaibenn.com', 'my'), 'https://my.alsvid.com');
});

test('local development keeps portal navigation on the local app', () => {
  assert.equal(portalUrlFor('localhost:3000', 'my'), '/my');
  assert.equal(portalUrlFor('127.0.0.1:3000', 'dealer'), '/dealer');
  assert.equal(portalUrlFor('0.0.0.0:3000', 'www'), '/');
});

test('legacy and canonical development hosts retain their own development suffix', () => {
  assert.equal(portalHostFor('www.dev.chaibenn.com', 'my'), 'my.dev.chaibenn.com');
  assert.equal(portalHostFor('www.dev.alsvid.com', 'my'), 'my.dev.alsvid.com');
});
