import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { acceptedChecks, acceptedJobs, acceptedRollback, successfulRuns, mainReleaseRuns, mainProductionRuns, releaseCandidates, failedRequiredJobs } from './release-gate.mjs';

const passed = (head_sha, conclusion = 'success') => ({
  head_sha, status: 'completed', conclusion,
});
const job = (name, conclusion = 'success', status = 'completed') => ({
  name, status, conclusion,
});

test('release CI accepts push or dispatched main runs but never PR or other branches', () => {
  const runs = [
    { head_branch: 'main', event: 'push' },
    { head_branch: 'main', event: 'workflow_dispatch' },
    { head_branch: 'main', event: 'pull_request' },
    { head_branch: 'develop', event: 'workflow_dispatch' },
  ];
  assert.deepEqual(mainReleaseRuns(runs), runs.slice(0, 2));
});

test('rollback evidence accepts successful production releases on main from supported triggers', () => {
  const runs = [
    { head_branch: 'main', event: 'push' },
    { head_branch: 'main', event: 'workflow_run' },
    { head_branch: 'main', event: 'workflow_dispatch' },
    { head_branch: 'feature', event: 'workflow_dispatch' },
    { head_branch: 'main', event: 'pull_request' },
  ];
  assert.deepEqual(mainProductionRuns(runs), runs.slice(0, 3));
});

test('a failed, pending or unrelated CI run is not acceptance', () => {
  assert.equal(successfulRuns([passed('same-sha', 'failure')], 'same-sha'), false);
  assert.equal(successfulRuns([passed('other-sha')], 'same-sha'), false);
  assert.equal(successfulRuns([{ head_sha: 'same-sha', status: 'in_progress', conclusion: null }], 'same-sha'), false);
});

test('production accepts CI for the same main commit without the retired workflow', () => {
  assert.equal(acceptedChecks({ 'ci.yml': [passed('main-sha')] }, 'main-sha'), true);
});

test('production rejects missing, failed or unrelated CI evidence', () => {
  assert.equal(acceptedChecks({}, 'main-sha'), false);
  assert.equal(acceptedChecks({ 'ci.yml': [passed('main-sha', 'failure')] }, 'main-sha'), false);
  assert.equal(acceptedChecks({ 'ci.yml': [passed('other-sha')] }, 'main-sha'), false);
});

test('CI acceptance requires both code verification and running-container checks', () => {
  assert.equal(acceptedJobs([job('verify'), job('containers')]), true);
  assert.equal(acceptedJobs([job('verify')]), false);
  assert.equal(acceptedJobs([job('containers')]), false);
  assert.equal(acceptedJobs([job('verify'), job('containers', 'failure')]), false);
  assert.equal(acceptedJobs([job('verify'), job('containers', 'skipped')]), false);
  assert.equal(acceptedJobs([job('verify'), job('containers', null, 'in_progress')]), false);
});

test('previous production releases can be rolled back only when explicitly enabled', async () => {
  assert.equal(await acceptedRollback([passed('released-sha')], 'released-sha', true), true);
  assert.equal(await acceptedRollback([passed('released-sha')], 'released-sha', false), false);
  assert.equal(await acceptedRollback([passed('released-sha')], 'never-released', true), false);
});


test('release gate accepts the same-SHA main CI run while required jobs pass but dispatch is still finishing', () => {
  const runs = [
    { head_sha: 'same-sha', head_branch: 'main', event: 'workflow_dispatch', status: 'in_progress', conclusion: null },
    { head_sha: 'same-sha', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' },
    { head_sha: 'same-sha', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'failure' },
    { head_sha: 'other-sha', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' },
    { head_sha: 'same-sha', head_branch: 'feature', event: 'workflow_dispatch', status: 'in_progress', conclusion: null },
  ];
  assert.deepEqual(releaseCandidates(runs, 'same-sha'), runs.slice(0, 2));
});

test('release gate retries missing job records but recognizes explicit required-job failures', () => {
  assert.equal(failedRequiredJobs([job('verify'), job('containers', 'failure')]), true);
  assert.equal(failedRequiredJobs([job('verify'), job('containers', null, 'in_progress')]), false);
  assert.equal(failedRequiredJobs([job('verify'), job('containers')]), false);
});


test('full production deployment verifies exact web SHA and the zh/de/en public catalogs', () => {
  const workflow = readFileSync(new URL('../.github/workflows/production-deploy.yml', import.meta.url), 'utf8');
  const verify = workflow.split('- name: Verify public website and admin, record deployed release')[1];
  assert.ok(verify, 'post-deployment production verification must exist');
  assert.match(verify, /\/release-check/);
  assert.match(verify, /payload\.service !== "alsvid-web" \|\| payload\.release !== process\.argv\[1\]/);
  assert.match(verify, /for locale in zh de en; do/);
  assert.match(verify, /for section in bikes accessories; do/);
  assert.match(verify, /data-bikes-catalog/);
  assert.match(verify, /data-accessories-catalog/);
  assert.match(verify, /Admin login mode verification failed/);
});


test('official FC1 reservation inbox fallback is consistently included in release images', () => {
  const expected = "${{ vars.NEXT_PUBLIC_FC1_RESERVATION_EMAIL || 'info@alsvidbike.com' }}";
  for (const [filename, occurrences] of [['production-deploy.yml', 4], ['www-deploy.yml', 3]]) {
    const workflow = readFileSync(new URL('../.github/workflows/' + filename, import.meta.url), 'utf8');
    assert.equal(workflow.split(expected).length - 1, occurrences, filename + ' must use the approved inbox for validation and Web build');
    assert.match(workflow, /FC1 reservation email is not configured/, filename + ' must continue checking email format');
  }
});
