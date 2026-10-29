import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Run only in disposable GitHub Actions CI');
const origin = 'http://127.0.0.1:8080';
const checks = [];
async function request(path) {
  return fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
}

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

await mkdir('.tmp', { recursive: true });
await writeFile('.tmp/commerce-lab-real-acceptance.json', JSON.stringify({
  sha: process.env.GITHUB_SHA,
  scope: 'CI read-only Web/API route and anonymous auth smoke; PostgreSQL domain writes covered by the separate commerce integration suite; not Production acceptance.',
  checks,
}, null, 2));
