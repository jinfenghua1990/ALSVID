import assert from 'node:assert/strict';
import test from 'node:test';
import { readCrmebCatalog } from './crmeb-catalog.ts';
const env = { CRMEB_LAB_ORIGIN: 'https://catalog.alsvidbike.com' };
const response = data => Response.json({ status: 200, data });
test('unconfigured and invalid configurations never make a request', async () => {
  const request = () => { throw new Error('must not request'); };
  assert.equal((await readCrmebCatalog({}, request)).state, 'not-configured');
  for (const origin of ['http://catalog.alsvidbike.com', 'https://user:pass@example.com',
    'https://example.com/admin', 'https://127.0.0.1', 'https://metadata.google.internal',
    'https://localhost', 'https://example.com?token=x', 'https://example.com:8443']) {
    assert.equal((await readCrmebCatalog({ CRMEB_LAB_ORIGIN: origin }, request)).state, 'configuration-error', origin);
  }
});
test('GET contract maps only public IDs and titles; it does not forward identity or money', async () => {
  const snapshot = await readCrmebCatalog(env, async (url, options) => {
    assert.equal(String(url), 'https://catalog.alsvidbike.com/api/products?page=1&limit=20');
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    return response([{ id: 12, store_name: ' FC1 ', price: '2599', stock: 999, image: 'javascript:alert(1)', secret: 'ignored' }]);
  });
  assert.equal(snapshot.state, 'connected');
  assert.deepEqual(snapshot.products, [{ id: 'crmeb-12', title: 'FC1' }]);
});
test('empty real catalog is distinct from unavailable; no samples replace failures', async () => {
  assert.equal((await readCrmebCatalog(env, async () => response([]))).state, 'connected');
  for (const payload of [
    { status: 400, data: [] }, { status: 200, data: {} },
    { status: 200, data: [{ id: 0, store_name: 'bad' }] },
    { status: 200, data: [{ id: 1, store_name: '' }] },
    { status: 200, data: [{ id: 1, store_name: 'x' }, { id: 1, store_name: 'duplicate' }] },
    { status: 200, data: Array.from({ length: 21 }, (_, i) => ({ id: i + 1, store_name: 'x' })) },
  ]) {
    const got = await readCrmebCatalog(env, async () => Response.json(payload));
    assert.equal(got.state, 'unavailable'); assert.deepEqual(got.products, []);
  }
});
test('HTTP errors, redirects, HTML, invalid JSON, oversize bodies and transport failures fail closed', async () => {
  for (const request of [
    async () => new Response('denied', { status: 403 }),
    async () => new Response(null, { status: 302 }),
    async () => new Response('<html/>', { headers: { 'content-type': 'text/html' } }),
    async () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    async () => new Response('x'.repeat(262145), { headers: { 'content-type': 'application/json' } }),
    async () => { throw new Error('private upstream details'); },
  ]) {
    const got = await readCrmebCatalog(env, request);
    assert.equal(got.state, 'unavailable');
    assert.deepEqual(got.products, []);
    assert.ok(!JSON.stringify(got).includes('private upstream'));
  }
});
