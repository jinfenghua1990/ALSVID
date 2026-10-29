import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminWorkspaceDraftStore, isAdminPath } from './workspace-state-store.ts';

test('admin drafts are isolated by query string', () => {
  const store = createAdminWorkspaceDraftStore();
  store.write('/admin/products?alsvidMenu=products', 'name', 'FC1');
  assert.equal(store.read('/admin/products?alsvidMenu=products', 'name', ''), 'FC1');
  assert.equal(store.read('/admin/products?alsvidMenu=orders', 'name', ''), '');
});

test('draft capacity evicts the least recently used location', () => {
  const store = createAdminWorkspaceDraftStore(2);
  store.write('/admin/a', 'value', 'a');
  store.write('/admin/b', 'value', 'b');
  store.touch('/admin/a');
  store.write('/admin/c', 'value', 'c');
  assert.equal(store.read('/admin/a', 'value', ''), 'a');
  assert.equal(store.read('/admin/b', 'value', ''), '');
  assert.equal(store.read('/admin/c', 'value', ''), 'c');
});

test('evict and clear remove drafts without affecting another location', () => {
  const store = createAdminWorkspaceDraftStore();
  store.write('/admin/a', 'value', 'a');
  store.write('/admin/b', 'value', 'b');
  store.evict('/admin/a');
  assert.equal(store.read('/admin/a', 'value', ''), '');
  assert.equal(store.read('/admin/b', 'value', ''), 'b');
  store.clear();
  assert.equal(store.size(), 0);
});

test('admin path validation accepts query strings but rejects other roots', () => {
  assert.equal(isAdminPath('/admin?returnTo=%2Fadmin'), true);
  assert.equal(isAdminPath('/admin/products?tab=details'), true);
  assert.equal(isAdminPath('/finance'), false);
});
