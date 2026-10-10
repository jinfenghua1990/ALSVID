import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductionValidationError } from './index.js';

test('production validation errors remain explicit domain errors', () => {
  const error = new ProductionValidationError('invalid production input');
  assert.equal(error.message, 'invalid production input');
  assert.equal(error instanceof Error, true);
});
