import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptedChecks, acceptedRollback, successfulRuns } from './release-gate.mjs';

const passed = (head_sha, conclusion = 'success') => ({
  head_sha, status: 'completed', conclusion,
});

test('a failed or unrelated CI run is not acceptance', () => {
  assert.equal(successfulRuns([passed('same-sha', 'failure')], 'same-sha'), false);
  assert.equal(successfulRuns([passed('other-sha')], 'same-sha'), false);
});

test('production accepts the same main commit after CI and container checks pass', () => {
  assert.equal(acceptedChecks({
    'ci.yml': [passed('main-sha')],
    'test-build.yml': [passed('main-sha')],
  }, 'main-sha'), true);
});

test('production waits when either required check is missing, failed, or for another commit', () => {
  assert.equal(acceptedChecks({
    'ci.yml': [passed('main-sha')],
    'test-build.yml': [],
  }, 'main-sha'), false);
  assert.equal(acceptedChecks({
    'ci.yml': [passed('main-sha')],
    'test-build.yml': [passed('main-sha', 'failure')],
  }, 'main-sha'), false);
  assert.equal(acceptedChecks({
    'ci.yml': [passed('main-sha')],
    'test-build.yml': [passed('other-sha')],
  }, 'main-sha'), false);
});

test('previous production releases can be rolled back only when explicitly enabled', async () => {
  assert.equal(await acceptedRollback([passed('released-sha')], 'released-sha', true), true);
  assert.equal(await acceptedRollback([passed('released-sha')], 'released-sha', false), false);
  assert.equal(await acceptedRollback([passed('released-sha')], 'never-released', true), false);
});
