import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFrameNumber, VehicleValidationError } from './index.js';

test('frame numbers normalize to stable uppercase identity', () => {
  assert.equal(normalizeFrameNumber(' als-fc1-0001 '), 'ALS-FC1-0001');
  assert.equal(normalizeFrameNumber('AB 1234'), 'AB1234');
});

test('frame numbers reject ambiguous punctuation', () => {
  assert.throws(() => normalizeFrameNumber('A/B/1'), VehicleValidationError);
});
