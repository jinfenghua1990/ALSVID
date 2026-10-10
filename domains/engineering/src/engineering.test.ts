import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPositiveQuantity, EngineeringValidationError } from './index.js';

test('BOM quantities must be positive finite numbers', () => {
  assert.doesNotThrow(() => assertPositiveQuantity(1));
  assert.doesNotThrow(() => assertPositiveQuantity(0.125));
  assert.throws(() => assertPositiveQuantity(0), EngineeringValidationError);
  assert.throws(() => assertPositiveQuantity(-1), EngineeringValidationError);
  assert.throws(() => assertPositiveQuantity(Number.NaN), EngineeringValidationError);
});
