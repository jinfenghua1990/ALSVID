import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createR2ObjectStorageFromEnv,
  R2ObjectStorageAdapter,
} from './r2-object-storage.js';

const ENDPOINT = 'https://0123456789abcdef.r2.cloudflarestorage.com';

type SendHandler = (command: unknown) => Promise<unknown>;

function fakeClient(send: SendHandler): S3Client {
  return { send } as unknown as S3Client;
}

function storage(
  send: SendHandler = async () => ({}),
  presign: typeof getSignedUrl = (async () => 'https://signed.example/object') as typeof getSignedUrl,
): R2ObjectStorageAdapter {
  return new R2ObjectStorageAdapter({
    endpoint: ENDPOINT,
    bucket: 'alsvid-production',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    client: fakeClient(send),
    presign,
  });
}

test('put uses the configured bucket, content type and ALSVID checksum metadata', async () => {
  let seen: unknown;
  const body = new TextEncoder().encode('ALSVID');
  const expected = createHash('sha256').update(body).digest('hex');
  const result = await storage(async (command) => {
    seen = command;
    return { ETag: '"etag-1"' };
  }).put({
    key: 'documents/test.txt',
    body,
    contentType: 'text/plain',
    checksumSha256: expected,
    metadata: { 'asset-id': 'asset-1', 'ALSVID SHA256': 'must-not-override' },
  });

  assert.ok(seen instanceof PutObjectCommand);
  assert.equal(seen.input.Bucket, 'alsvid-production');
  assert.equal(seen.input.Key, 'documents/test.txt');
  assert.equal(seen.input.ContentType, 'text/plain');
  assert.equal(seen.input.ContentLength, body.byteLength);
  assert.equal(seen.input.Metadata?.['asset-id'], 'asset-1');
  assert.equal(seen.input.Metadata?.['alsvid-sha256'], expected);
  assert.equal(result.etag, 'etag-1');
  assert.equal(result.checksumSha256, expected);
});

test('put rejects a mismatched checksum before provider I/O', async () => {
  let called = false;
  await assert.rejects(
    storage(async () => {
      called = true;
      return {};
    }).put({
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

test('head maps object metadata and returns null for a provider 404', async () => {
  let count = 0;
  const adapter = storage(async (command) => {
    assert.ok(command instanceof HeadObjectCommand);
    count += 1;
    if (count === 1) {
      return {
        ContentLength: 42,
        ContentType: 'application/pdf',
        ETag: '"etag-2"',
        Metadata: { 'alsvid-sha256': 'a'.repeat(64) },
      };
    }
    throw { name: 'NotFound', $metadata: { httpStatusCode: 404 } };
  });

  assert.deepEqual(await adapter.head('documents/file.pdf'), {
    key: 'documents/file.pdf',
    size: 42,
    etag: 'etag-2',
    contentType: 'application/pdf',
    checksumSha256: 'a'.repeat(64),
  });
  assert.equal(await adapter.head('documents/missing.pdf'), null);
});

test('delete delegates to the S3-compatible provider', async () => {
  let seen: unknown;
  await storage(async (command) => {
    seen = command;
    return {};
  }).delete('documents/file.pdf');

  assert.ok(seen instanceof DeleteObjectCommand);
  assert.equal(seen.input.Bucket, 'alsvid-production');
  assert.equal(seen.input.Key, 'documents/file.pdf');
});

test('signed read and write URLs use SDK presigning with bounded expiry', async () => {
  const calls: Array<{ command: unknown; expiresIn: number | undefined }> = [];
  const presign = (async (_client, command, options) => {
    calls.push({ command, expiresIn: options?.expiresIn });
    return `https://signed.example/${calls.length}`;
  }) as typeof getSignedUrl;
  const adapter = storage(async () => ({}), presign);

  assert.equal(await adapter.signedReadUrl('vehicles/FC1/manual.pdf', 900), 'https://signed.example/1');
  assert.equal(await adapter.signedWriteUrl('incoming/photo.jpg', 300, 'image/jpeg'), 'https://signed.example/2');

  assert.ok(calls[0]?.command instanceof GetObjectCommand);
  assert.equal(calls[0]?.expiresIn, 900);
  assert.ok(calls[1]?.command instanceof PutObjectCommand);
  if (calls[1]?.command instanceof PutObjectCommand) {
    assert.equal(calls[1].command.input.ContentType, 'image/jpeg');
  }
  assert.equal(calls[1]?.expiresIn, 300);
  await assert.rejects(adapter.signedReadUrl('x', 604801), /between 1 and 604800/);
});

test('environment factory maps the existing OBJECT_STORAGE variables', () => {
  const adapter = createR2ObjectStorageFromEnv({
    OBJECT_STORAGE_PROVIDER: 'r2',
    OBJECT_STORAGE_ENDPOINT: ENDPOINT,
    OBJECT_STORAGE_REGION: 'auto',
    OBJECT_STORAGE_BUCKET: 'alsvid-production',
    OBJECT_STORAGE_ACCESS_KEY: 'test-access-key',
    OBJECT_STORAGE_SECRET_KEY: 'test-secret-key',
  });
  assert.ok(adapter instanceof R2ObjectStorageAdapter);
  assert.throws(
    () => createR2ObjectStorageFromEnv({ OBJECT_STORAGE_PROVIDER: 'local-disk' }),
    /Unsupported object storage provider/,
  );
});

test('configuration rejects invalid R2 endpoints and bucket names', () => {
  assert.throws(
    () => new R2ObjectStorageAdapter({
      endpoint: 'http://example.invalid',
      bucket: 'alsvid-production',
      accessKeyId: 'a',
      secretAccessKey: 'b',
    }),
    /HTTPS/,
  );
  assert.throws(
    () => new R2ObjectStorageAdapter({
      endpoint: ENDPOINT,
      bucket: 'ALSVID.bucket',
      accessKeyId: 'a',
      secretAccessKey: 'b',
    }),
    /3-63/,
  );
});
