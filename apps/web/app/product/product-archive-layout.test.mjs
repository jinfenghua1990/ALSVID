import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../_design/renderer.tsx', import.meta.url), 'utf8');
const client = readFileSync(new URL('./product-client.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('./product.module.css', import.meta.url), 'utf8');

test('canonical admin product module embeds the live single-source product archive', () => {
  assert.match(renderer, /isLiveProductRoot\s*\?\s*\(\s*<ProductClient embedded \/>/);
  assert.match(renderer, /import ProductClient from '\.\.\/product\/product-client'/);
});

test('product archive is list-first with advanced sections collapsed', () => {
  assert.ok(client.indexOf('id="model-register"') < client.indexOf('id="product-types"'));
  assert.ok(client.indexOf('id="model-register"') < client.indexOf('id="models"'));
  assert.match(client, /id="product-maintenance-panel"/);
  assert.match(client, /id="parts-library-panel"/);
  assert.match(client, /id="production-bom"/);
  assert.doesNotMatch(client, /id="engineering-panel"/);
  assert.match(client, /revealLinkedPanel/);
  assert.match(css, /\.modelTable tbody tr:nth-child\(even\)/);
});
