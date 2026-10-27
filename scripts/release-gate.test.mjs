import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
  for (const [filename, occurrences] of [['production-deploy.yml', 5], ['www-deploy.yml', 3]]) {
    const workflow = readFileSync(new URL('../.github/workflows/' + filename, import.meta.url), 'utf8');
    assert.equal(workflow.split(expected).length - 1, occurrences, filename + ' must use the approved inbox for validation and Web build');
    assert.match(workflow, /FC1 reservation email is not configured/, filename + ' must continue checking email format');
  }
});

const deploymentSteps = [
  ['production-deploy.yml', 'Check HTTPS connectivity before changing Production', 'Verify public website and admin, record deployed release'],
  ['www-deploy.yml', 'Check HTTPS connectivity before changing the Web service', 'Confirm WWW is serving the expected release'],
];

function deploymentStepScript(filename, stepName) {
  const workflow = readFileSync(new URL('../.github/workflows/' + filename, import.meta.url), 'utf8');
  const step = workflow.split('      - name: ' + stepName + '\n')[1]?.split('\n      - name:')[0];
  assert.ok(step, filename + ' is missing ' + stepName);
  const script = step.split('        run: |\n')[1];
  assert.ok(script, 'step must contain an executable shell script');
  return script.split('\n').map(line => line.replace(/^ {10}/, '')).join('\n');
}

function runDomainCheck(script, httpStatus, transportExit = 0) {
  // Execute the actual workflow shell with curl's HTTP/transport exit behavior.
  // No requests or production credentials are used by these tests.
  return spawnSync('bash', ['-c', `
    curl() {
      if [[ "$MOCK_TRANSPORT_EXIT" != "0" ]]; then return "$MOCK_TRANSPORT_EXIT"; fi
      if [[ "$MOCK_HTTP_STATUS" =~ ^[45] && " $* " == *" --fail "* ]]; then return 22; fi
      printf '%s' "$MOCK_HTTP_STATUS"
    }
    ${script}
  `], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MOCK_HTTP_STATUS: String(httpStatus), MOCK_TRANSPORT_EXIT: String(transportExit),
      PUBLIC_SITE_URL: 'https://www.example.test/fc1',
      ADMIN_LOGIN_URL: 'https://admin.example.test/login',
      AUTH_BASE_URL: 'https://admin.example.test', RELEASE_SHA: 'test-release',
    },
  });
}

test('a broken currently serving page cannot block a repair rollout', () => {
  for (const [filename, preflight] of deploymentSteps) {
    for (const status of [200, 404, 503]) {
      const result = runDomainCheck(deploymentStepScript(filename, preflight), status);
      assert.equal(result.status, 0, filename + ': ' + result.stderr);
      assert.match(result.stdout, new RegExp('Pre-deploy HTTP ' + status));
      if (status >= 400) assert.match(result.stdout, /::warning title=Current production page unhealthy/);
    }
  }
});

test('pre-deployment DNS, TLS and timeout errors still stop the rollout', () => {
  for (const [filename, preflight] of deploymentSteps) {
    for (const exit of [6, 28, 35, 60]) {
      const result = runDomainCheck(deploymentStepScript(filename, preflight), '000', exit);
      assert.notEqual(result.status, 0, filename + ' must reject curl transport error ' + exit);
      assert.match(result.stderr, /Production domain unreachable/);
    }
  }
});

test('post-deployment verification still rejects missing or failing public pages', () => {
  for (const [filename, , verification] of deploymentSteps) {
    for (const status of [404, 503]) {
      const result = runDomainCheck(deploymentStepScript(filename, verification), status);
      assert.equal(result.status, 22, filename + ' must reject HTTP ' + status + ' after rollout');
    }
  }
});
