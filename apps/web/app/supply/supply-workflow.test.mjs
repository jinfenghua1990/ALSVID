import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./supply-client.tsx', import.meta.url), 'utf8');

test('purchase order editor supports multiple independent material rows', () => {
  assert.match(source, /poRows\.map\(row => purchaseLine\(form, row\.id\)\)/);
  assert.match(source, /setPoRows\(rows => \[\.\.\.rows, \{ id: nextPoId\.current\+\+, itemType: 'PART' \}\]\)/);
  assert.match(source, /rows\.filter\(item => item\.id !== row\.id\)/);
});

test('supplier confirmation covers every PO line and receipt does not select first line silently', () => {
  assert.match(source, /selectedLines\.map\(line => \(\{ purchaseOrderLineId: line\.id/);
  assert.match(source, /selectedLines\.find\(item => item\.id === form\.get\('purchaseOrderLineId'\)\)/);
  assert.doesNotMatch(source, /selectedLines\[0\]/);
});

test('supplier data load failures stay independent and writes have a pending-request guard', () => {
  assert.match(source, /Promise\.allSettled\(paths\.map\(path => api\(path\)\)\)/);
  assert.match(source, /setLoadErrors\(failures\)/);
  assert.match(source, /if \(posting\.current\) return/);
  assert.match(source, /posting\.current = false/);
});
