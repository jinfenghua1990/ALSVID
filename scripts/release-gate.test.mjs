import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptedDevelopment, acceptedRollback, successfulRuns } from './release-gate.mjs';

const successful = { id: 1, head_sha: 'development-sha', head_branch: 'develop', event: 'push', status: 'completed', conclusion: 'success' };

test('a failed or unrelated CI run is not acceptance', () => {
  assert.equal(successfulRuns([{ ...successful, conclusion: 'failure' }], successful.head_sha), false);
  assert.equal(successfulRuns([successful], 'other-sha'), false);
});

test('a production merge with a different commit SHA can promote the same tested tree', async () => {
  assert.equal(await acceptedDevelopment([successful], 'same-tree', async () => 'same-tree', async () => true), successful);
});

test('untested source changes are refused even if Development deployment passed', async () => {
  assert.equal(await acceptedDevelopment([successful], 'new-tree', async () => 'old-tree', async () => true), null);
});

test('a Development deployment without successful CI is refused', async () => {
  assert.equal(await acceptedDevelopment([successful], 'same-tree', async () => 'same-tree', async () => false), null);
});

test('a deployment from another branch or a failed deployment is refused', async () => {
  for (const run of [{ ...successful, head_branch: 'feature' }, { ...successful, conclusion: 'failure' }, { ...successful, event: 'workflow_dispatch' }]) {
    assert.equal(await acceptedDevelopment([run], 'same-tree', async () => 'same-tree', async () => true), null);
  }
});

test('previous production releases can be rolled back only when explicitly enabled', async () => {
  assert.equal(await acceptedRollback([successful], successful.head_sha, true), true);
  assert.equal(await acceptedRollback([successful], successful.head_sha, false), false);
  assert.equal(await acceptedRollback([successful], 'never-released', true), false);
});
