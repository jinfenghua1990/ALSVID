import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedRelease, assertTestConfig, agentPlist } from './macos-test-auto-update.mjs';
const sha = 'a'.repeat(40);
const passed = [{ id: 1, name: 'CI', head_sha: sha, event: 'push', head_branch: 'main', status: 'completed', conclusion: 'success' }];
test('exact-main push CI must pass', () => {
  assert.equal(acceptedRelease(passed, sha), true);
  assert.equal(acceptedRelease([], sha), false);
  assert.equal(acceptedRelease(passed, 'b'.repeat(40)), false);
  assert.equal(acceptedRelease(passed.map(r => ({ ...r, event: 'pull_request' })), sha), false);
  assert.equal(acceptedRelease(passed.map(r => ({ ...r, head_branch: 'other' })), sha), false);
});
test('a newer failed or running CI retry does not reuse a historical success', () => {
  for (const state of [{ status: 'in_progress', conclusion: null }, { status: 'completed', conclusion: 'failure' }]) {
    assert.equal(acceptedRelease([...passed, { ...passed[0], id: 9, ...state }], sha), false);
  }
});
test('production or missing Test bindings are rejected', () => {
  const config = { name: 'infra', services: Object.fromEntries(['web', 'api', 'worker'].map(n => [n, { environment: { NODE_ENV: 'test' } }])) };
  assert.equal(assertTestConfig(config), 'infra');
  config.services.web.environment.ALSVID_ENV = 'production';
  assert.throws(() => assertTestConfig(config));
  assert.throws(() => assertTestConfig({ name: 'infra', services: {} }));
});
test('LaunchAgent escapes paths and runs without a shell or privileged account', () => {
  const plist = agentPlist('/my & node', '/path with spaces/update.mjs', '/tmp/test.log', '/usr/bin');
  assert.ok(plist.includes('/my &amp; node'));
  assert.ok(plist.includes('<integer>300</integer>'));
  assert.ok(plist.includes('<key>RunAtLoad</key><true/>'));
  assert.ok(!plist.includes('sudo'));
});
