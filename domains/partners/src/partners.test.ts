import assert from 'node:assert/strict';
import test from 'node:test';
import { assertUniqueRoles, normalizeIdentifier, PartnerValidationError } from './index.js';

test('identifier normalization makes legal identifiers comparable', () => {
  assert.deepEqual(normalizeIdentifier(' eori ', ' de 123 456 '), {
    scheme: 'EORI',
    rawValue: 'de 123 456',
    normalizedValue: 'DE123456',
  });
  assert.equal(normalizeIdentifier('email', ' SALES@Example.COM ').normalizedValue, 'sales@example.com');
});

test('a Partner cannot receive the same role twice', () => {
  assert.doesNotThrow(() => assertUniqueRoles(['DEALER', 'SERVICE_PARTNER']));
  assert.throws(() => assertUniqueRoles(['DEALER', 'DEALER']), PartnerValidationError);
});
