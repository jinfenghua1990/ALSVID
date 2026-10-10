import assert from 'node:assert/strict';
import test from 'node:test';
import { AssetValidationError, normalizeSha256 } from './index.js';

test('SHA-256 values normalize and reject malformed checksums', () => {
  const hash = 'A'.repeat(64);
  assert.equal(normalizeSha256(hash), 'a'.repeat(64));
  assert.equal(normalizeSha256(undefined), null);
  assert.throws(() => normalizeSha256('abc'), AssetValidationError);
});
