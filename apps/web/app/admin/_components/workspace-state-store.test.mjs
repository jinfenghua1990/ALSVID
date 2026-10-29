import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminWorkspaceDraftStore, isSafeAdminRoute } from './workspace-state-store.ts';

test('Admin soft navigation rejects external and cross-portal links', () => {
  assert.equal(isSafeAdminRoute('/admin/finance'), true);
  assert.equal(isSafeAdminRoute('/admin/product?alsvidMenu=x'), true);
  for (const url of ['/login', '/administrator', '//evil.example/admin',
    'https://evil.example/admin', 'javascript:alert(1)', '/admin\\escape']) {
    assert.equal(isSafeAdminRoute(url), false, url);
  }
});

test('same Admin route retains unsaved drafts until explicit close or reset', () => {
  const cache = createAdminWorkspaceDraftStore(2);
  let events = 0;
  const unsubscribe = cache.subscribe('/admin/commerce-lab/reference', 'items', () => events++);
  const items = [{ id: 'demo-fc1', name: 'FC1 CI 示例', price: 3199 }];
  cache.write('/admin/commerce-lab/reference', 'items', items);
  cache.touch('/admin/finance');
  cache.touch('/admin/commerce-lab/reference');
  assert.deepEqual(cache.read('/admin/commerce-lab/reference', 'items', []), items);
  assert.equal(events, 1);
  cache.evict('/admin/commerce-lab/reference');
  assert.deepEqual(cache.read('/admin/commerce-lab/reference', 'items', []), []);
  assert.equal(events, 2);
  unsubscribe();
});

test('bounded workspace cache evicts oldest and cannot store other portals', () => {
  const cache = createAdminWorkspaceDraftStore(2);
  cache.write('/admin/a', 'draft', 'A');
  cache.write('/admin/b', 'draft', 'B');
  cache.touch('/admin/a');
  cache.write('/admin/c', 'draft', 'C');
  assert.equal(cache.size(), 2);
  assert.equal(cache.read('/admin/a', 'draft', ''), 'A');
  assert.equal(cache.read('/admin/b', 'draft', 'fresh'), 'fresh');
  assert.equal(cache.read('/admin/c', 'draft', ''), 'C');
  assert.throws(() => cache.write('/login', 'draft', 'secret'), /Admin drafts/);
  cache.clear();
  assert.equal(cache.size(), 0);
  assert.equal(cache.read('/admin/a', 'draft', 'fresh'), 'fresh');
});
