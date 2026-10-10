import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { R2ObjectStorageAdapter } from './r2-object-storage.js';

const FIXED_NOW = new Date('2026-10-10T10:00:00.000Z');
const ENDPOINT = 'https://0123456789abcdef.r2.cloudflarestorage.com';

function adapter(fetcher: typeof fetch = fetch): R2ObjectStorageAdapter {
  return new R2ObjectStorageAdapter({
    endpoint: ENDPOINT,
    bucket: 'alsvid-production',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    fetcher,
    now: () => FIXED_NOW,
  });
}

test('presigned read URL is scoped to bucket/key and expires', async () => {
  const url = new URL(await adapter().signedReadUrl('vehicles/FC1 001/manual.pdf', 900));
  assert.equal(url.hostname, 'alsvid-production.0123456789abcdef.r2.cloudflarestorage.com');
  assert.equal(url.pathname, '/vehicles/FC1%20001/manual.pdf');
  assert.equal(url.searchParams.get('X-Amz-Algorithm'), 'AWS4-HMAC-SHA256');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '900');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'host');
  assert.ok(url.searchParams.get('X-Amz-Signature'));
});

test('presigned write URL signs content type when supplied', async () => {
  const url = new URL(await adapter().signedWriteUrl('incoming/photo.jpg', 300, 'image/jpeg'));
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
});

test('put signs request and persists ALSVID SHA-256 metadata', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response('', { status: 200, headers: { etag: '"etag-1"' } });
  }) as typeof fetch;

  const body = new TextEncoder().encode('ALSVID');
  const expected = createHash('sha256').update(body).digest('hex');
  const result = await adapter(fetcher).put({
    key: 'documents/test.txt',
    body,
    contentType: 'text/plain',
    checksumSha256: expected,
    metadata: { 'asset-id': 'asset-1' },
  });

  assert.equal(requestUrl, `${ENDPOINT.replace('https://', 'https://alsvid-production.')}/documents/test.txt`);
  assert.equal(requestInit?.method, 'PUT');
  const headers = requestInit?.headers as Record<string, string>;
  assert.match(headers.authorization, /^AWS4-HMAC-SHA256 Credential=/);
  assert.equal(headers['x-amz-meta-alsvid-sha256'], expected);
  assert.equal(headers['x-amz-meta-asset-id'], 'asset-1');
  assert.equal(result.checksumSha256, expected);
  assert.equal(result.etag, 'etag-1');
});

test('put rejects a mismatched checksum before network I/O', async () => {
  let called = false;
  const fetcher = (async () => {
    called = true;
    return new Response('', { status: 200 });
  }) as typeof fetch;

  await assert.rejects(
    adapter(fetcher).put({
      key: 'documents/test.txt',
      body: new TextEncoder().encode('ALSVID'),
      contentType: 'text/plain',
      checksumSha256: '0'.repeat(64),
      metadata: {},
    }),
    /does not match/,
  );
  assert.equal(called, false);
});

test('head exposes stored checksum and handles missing objects', async () => {
  let responseIndex = 0;
  const fetcher = (async () => {
    responseIndex += 1;
    if (responseIndex === 1) {
      return new Response(null, {
        status: 200,
        headers: {
          'content-length': '42',
          'content-type': 'application/pdf',
          etag: '"etag-2"',
          'x-amz-meta-alsvid-sha256': 'a'.repeat(64),
        },
      });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;

  const storage = adapter(fetcher);
  assert.deepEqual(await storage.head('documents/file.pdf'), {
    key: 'documents/file.pdf',
    size: 42,
    etag: 'etag-2',
    contentType: 'application/pdf',
    checksumSha256: 'a'.repeat(64),
  });
  assert.equal(await storage.head('documents/missing.pdf'), null);
});
