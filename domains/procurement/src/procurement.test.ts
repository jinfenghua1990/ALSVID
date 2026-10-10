import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcurementValidationError } from './index.js';

// Domain behavior that does not need persistence is intentionally small; state/immutability invariants are database integration-tested.
test('invalid construction surfaces explicit validation errors', () => {
  const error = new ProcurementValidationError('example');
  assert.equal(error.message, 'example');
  assert.equal(error instanceof Error, true);
});
