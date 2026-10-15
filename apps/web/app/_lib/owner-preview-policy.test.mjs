import assert from 'node:assert/strict';
import test from 'node:test';
import { ownerPreviewAllowed } from './owner-preview-policy.ts';

test('owner fixture preview requires both development mode and explicit opt-in', () => {
  assert.equal(ownerPreviewAllowed('my', 'development', '1'), true);
  for (const environment of ['production', 'test', 'staging', undefined]) {
    assert.equal(ownerPreviewAllowed('my', environment, '1'), false);
  }
  for (const flag of [undefined, '', '0', 'true']) {
    assert.equal(ownerPreviewAllowed('my', 'development', flag), false);
  }
});

test('owner preview never bypasses the Admin or Dealer session guards', () => {
  for (const portal of ['admin', 'dealer', 'unknown']) {
    assert.equal(ownerPreviewAllowed(portal, 'development', '1'), false);
    assert.equal(ownerPreviewAllowed(portal, 'production', '1'), false);
  }
});
