import { createHash } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  ObjectStoragePort,
  PutObjectInput,
  StoredObjectMetadata,
} from '@alsvid/ports';

export interface R2ObjectStorageConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  client?: S3Client;
  presign?: typeof getSignedUrl;
}

export class R2ObjectStorageAdapter implements ObjectStoragePort {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly presign: typeof getSignedUrl;

  constructor(config: R2ObjectStorageConfig) {
    const endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:') throw new Error('R2 endpoint must use HTTPS');
    if (endpoint.pathname !== '/' || endpoint.search || endpoint.hash) {
      throw new Error('R2 endpoint must be an origin URL without path, query, or hash');
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(config.bucket)) {
      throw new Error('R2 bucket name must be 3-63 lowercase letters, numbers, or hyphens');
    }
    if (!config.accessKeyId.trim() || !config.secretAccessKey.trim()) {
      throw new Error('R2 credentials are required');
    }

    this.bucket = config.bucket;
    this.client = config.client ?? new S3Client({
      region: config.region ?? 'auto',
      endpoint: endpoint.toString(),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.presign = config.presign ?? getSignedUrl;
  }

  async put(input: PutObjectInput): Promise<StoredObjectMetadata> {
    validateKey(input.key);
    const body = await collectBody(input.body);
    const actualChecksum = sha256(body);
    if (input.checksumSha256 && normalizeChecksum(input.checksumSha256) !== actualChecksum) {
      throw new Error('Object body SHA-256 does not match the supplied checksum');
    }

    const response = await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: body,
      ContentLength: body.byteLength,
      ...(input.contentType ? { ContentType: input.contentType } : {}),
      Metadata: {
        ...normalizeMetadata(input.metadata),
        'alsvid-sha256': actualChecksum,
      },
    }));

    return {
      key: input.key,
      size: body.byteLength,
      etag: trimEtag(response.ETag),
      contentType: input.contentType,
      checksumSha256: actualChecksum,
    };
  }

  async head(key: string): Promise<StoredObjectMetadata | null> {
    validateKey(key);
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        key,
        size: response.ContentLength ?? null,
        etag: trimEtag(response.ETag),
        contentType: response.ContentType ?? null,
        checksumSha256: normalizeNullableChecksum(response.Metadata?.['alsvid-sha256'] ?? null),
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    validateKey(key);
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async signedReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    validateKey(key);
    validateExpiry(expiresInSeconds);
    return this.presign(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async signedWriteUrl(
    key: string,
    expiresInSeconds: number,
    contentType: string | null,
  ): Promise<string> {
    validateKey(key);
    validateExpiry(expiresInSeconds);
    return this.presign(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async verifyChecksum(key: string, expectedSha256: string): Promise<boolean> {
    const metadata = await this.head(key);
    if (!metadata?.checksumSha256) return false;
    return metadata.checksumSha256 === normalizeChecksum(expectedSha256);
  }
}

async function collectBody(body: PutObjectInput['body']): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of body) {
    chunks.push(chunk);
    total += chunk.byteLength;
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function validateKey(key: string): void {
  if (!key || key.startsWith('/') || key.includes('\\')) {
    throw new Error('Object key must be a non-empty relative POSIX-style key');
  }
}

function validateExpiry(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 604800) {
    throw new Error('Presigned URL expiry must be between 1 and 604800 seconds');
  }
}

function normalizeMetadata(metadata: Readonly<Record<string, string>>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!normalizedKey || normalizedKey === 'alsvid-sha256') continue;
    output[normalizedKey] = value.trim();
  }
  return output;
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeChecksum(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error('SHA-256 checksum must be 64 hexadecimal characters');
  }
  return normalized;
}

function normalizeNullableChecksum(value: string | null): string | null {
  if (!value) return null;
  try {
    return normalizeChecksum(value);
  } catch {
    return null;
  }
}

function trimEtag(value: string | undefined): string | null {
  if (!value) return null;
  return value.replace(/^"|"$/g, '');
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return candidate.name === 'NotFound' || candidate.name === 'NoSuchKey' || candidate.$metadata?.httpStatusCode === 404;
}
