import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { readCrmebCatalog } from '../../apps/web/app/_experiments/commerce-lab/crmeb-catalog.ts';

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.CRMEB_NATIVE_CI, 'disposable');
let requests = 0;
// Only the test transport substitutes loopback. Production origin validation is unchanged.
const request = (url, options) => {
  assert.equal(url.origin, 'https://crmeb-native-ci.alsvidbike.com');
  assert.equal(url.pathname, '/api/products');
  assert.equal(options.method, 'GET');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  requests += 1;
  return fetch('http://127.0.0.1:18080' + url.pathname + url.search, options);
};
const env = { CRMEB_LAB_ORIGIN: 'https://crmeb-native-ci.alsvidbike.com' };
const before = await readCrmebCatalog(env, request);
assert.equal(before.state, 'connected', 'The native endpoint must satisfy the deployed adapter contract');
assert.deepEqual([...before.products].sort((a,b)=>a.id.localeCompare(b.id)), [
  { id: 'crmeb-910001', title: 'ALSVID FC1 native CI' },
  { id: 'crmeb-910002', title: 'ALSVID FC2 native CI' },
]);
execFileSync('php', ['scripts/commerce-lab/native-bootstrap.php', 'rename'], { stdio: 'pipe' });
const after = await readCrmebCatalog(env, request);
assert.equal(after.state, 'connected');
assert.equal(after.products.find(item => item.id === 'crmeb-910001')?.title, 'ALSVID FC1 native CI renamed');
assert.equal(after.products.length, 2);
assert.equal(requests, 2);
const admin = await fetch('http://127.0.0.1:18080/admin/index.html');
assert.equal(admin.status, 200);
assert.match(await admin.text(), /<html|<!doctype/i);
await mkdir('.tmp/crmeb-native-evidence', { recursive: true });
await writeFile('.tmp/crmeb-native-evidence/report.json', JSON.stringify({
  appCommit: process.env.APP_COMMIT, upstreamCommit: 'da8d3b93400f3c660aa54d38b54ada387c963cd9',
  nativeRuntime: 'PHP 7.4 / MySQL 8 / Redis 7', before, after,
  nativeAdminHtml: true, transport: 'loopback-only CI, production adapter with injected transport',
  liveDeployment: false, paymentsEnabled: false,
}, null, 2));
console.log('Native CRMEB product read, fixture rename propagation, and Admin HTML verified.');
