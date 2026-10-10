import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProductCode, ProductValidationError } from './index.js';

test('product codes normalize to stable uppercase identifiers', () => {
  assert.equal(normalizeProductCode(' fc1-pro '), 'FC1-PRO');
  assert.equal(normalizeProductCode('ct_1'), 'CT_1');
});

test('product codes reject spaces and punctuation', () => {
  assert.throws(() => normalizeProductCode('FC 1'), ProductValidationError);
  assert.throws(() => normalizeProductCode('FC1/PRO'), ProductValidationError);
});
