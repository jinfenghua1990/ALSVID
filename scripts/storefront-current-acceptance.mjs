import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run only in disposable GitHub Actions CI');
const origin = 'http://127.0.0.1:8080';
const checks = [];
async function request(path) {
  return fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
}

let ready = false;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const [api, web] = await Promise.all([request('/api/health'), request('/zh/shop-preview')]);
    if (api.ok && web.ok) { ready = true; break; }
  } catch { /* Containers can still be starting after the CI override is applied. */ }
  await new Promise(resolve => setTimeout(resolve, 500));
}
assert.ok(ready, 'isolated CI API and Web are ready');

for (const locale of ['zh', 'de', 'en']) {
  const page = await request('/' + locale + '/shop-preview');
  assert.equal(page.status, 200, locale + ' public storefront preview');
  const html = await page.text();
  assert.match(html, /ALSVID/, locale + ' storefront content');
  checks.push(locale + ' public storefront preview renders from tested Web image');
}
const catalog = await request('/api/v1/commerce-lab/public/products');
assert.equal(catalog.status, 200, 'public Commerce catalog API');
const body = await catalog.json();
assert.deepEqual(body.data.items, [], 'disposable PostgreSQL begins without public catalog records');
assert.equal(body.data.total, 0);
const anonymous = await request('/api/v1/commerce-lab/products');
assert.equal(anonymous.status, 401, 'private Commerce catalog rejects anonymous access');
const editor = await request('/admin/ecommerce/page-builder');
assert.equal(editor.status, 307, 'Admin-only editor redirects anonymous callers');
assert.match(editor.headers.get('location') ?? '', /\/login/, 'editor redirect goes to login');
checks.push('Commerce API public/private boundaries and guarded visual editor route');

// Only bootstrap inside the explicitly isolated CI database, never a live database.
const guard = [
  "import assert from 'node:assert/strict';",
  "assert.equal(process.env.NODE_ENV,'test');",
  "const target=new URL(process.env.DATABASE_URL??'');",
  "assert.equal(target.hostname,'postgres');",
  "assert.equal(target.pathname,'/alsvid_test');",
  "assert.equal(target.username,'alsvid_test');",
  "const {database,identityService}=await import('./dist/runtime.js');",
  "try { await identityService.bootstrapAdmin('storefront-ci@example.test','EphemeralStorefront123!','CI storefront acceptance'); } finally { await database.close(); }",
].join('\n');
execFileSync('docker', ['compose', '-p', 'alsvid-ci', '-f', 'infra/docker-compose.test.yml', '-f', 'infra/docker-compose.commerce-acceptance.yml', 'exec', '-T', 'api', 'node', '--input-type=module', '-e', guard], { timeout: 30000 });

const login = await fetch(origin + '/api/session/login', {
  method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(15000),
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'storefront-ci@example.test', password: 'EphemeralStorefront123!', portal: 'admin' }),
});
assert.equal(login.status, 200, 'real admin password login');
const user = (await login.json()).data;
assert.ok(user.roles.includes('system_admin'), 'login returns the bootstrap admin role');
const sessionCookie = login.headers.getSetCookie().find(value => value.startsWith('alsvid_session='));
assert.ok(sessionCookie && /httponly/i.test(sessionCookie), 'login sets an HTTP-only session');
const passwordSetup = await fetch(origin + '/api/session/password', {
  method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(15000),
  headers: { origin, cookie: sessionCookie.split(';')[0], 'content-type': 'application/json' },
  body: JSON.stringify({ password: 'EphemeralStorefrontUpdated123!', portal: 'admin' }),
});
assert.equal(passwordSetup.status, 201, 'bootstrap admin completes mandatory password setup');
const signedInEditor = await fetch(origin + '/admin/ecommerce/page-builder', {
  redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { cookie: sessionCookie.split(';')[0] },
});
assert.equal(signedInEditor.status, 200, 'authenticated admin can open the editor');
assert.match(await signedInEditor.text(), /商城首页装修/, 'editor content is rendered');
checks.push('guarded disposable PostgreSQL admin bootstrap, real password login and authenticated editor access');

await mkdir('.tmp', { recursive: true });
await writeFile('.tmp/commerce-lab-real-acceptance.json', JSON.stringify({
  sha: process.env.GITHUB_SHA,
  scope: 'CI Web/API route, authentication and isolated PostgreSQL bootstrap; not Production acceptance.',
  checks,
}, null, 2));
