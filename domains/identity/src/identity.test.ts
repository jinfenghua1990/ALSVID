import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLoginIdentifier } from './application/identity-service.js';
import { assertPermission, hashPassword, Permission, PermissionDeniedError, verifyPassword } from './index.js';

const actor = {
  userId: 'u1',
  email: 'admin@example.com',
  displayName: 'Admin',
  roles: ['partner_viewer'],
  permissions: [Permission.PartnerRead],
};

test('permission checks allow granted capability and deny absent capability', () => {
  assert.doesNotThrow(() => assertPermission(actor, Permission.PartnerRead));
  assert.throws(() => assertPermission(actor, Permission.PartnerWrite), PermissionDeniedError);
});

test('password hashes verify without storing the plaintext password', async () => {
  const encoded = await hashPassword('correct-horse-battery-staple');
  assert.equal(encoded.includes('correct-horse-battery-staple'), false);
  assert.equal(await verifyPassword('correct-horse-battery-staple', encoded), true);
  assert.equal(await verifyPassword('wrong-password', encoded), false);
});

test('account-password login normalizes email identifiers', () => {
  assert.equal(normalizeLoginIdentifier('  Admin@Example.COM  '), 'admin@example.com');
});

test('account-password login accepts E.164 phone identifiers without guessing country codes', () => {
  assert.equal(normalizeLoginIdentifier('+86 138-1234-5678'), '+8613812345678');
  assert.throws(() => normalizeLoginIdentifier('13812345678'));
});
