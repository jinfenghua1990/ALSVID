import { createHash, createHmac } from 'node:crypto';
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
  fetcher?: typeof fetch;
  now?: () => Date;
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

export class R2ObjectStorageAdapter implements ObjectStoragePort {
  private readonly endpoint: URL;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly fetcher: typeof fetch;
  private readonly now: () => Date;

  constructor(config: R2ObjectStorageConfig) {
    this.endpoint = new URL(config.endpoint);
    if (this.endpoint.protocol !== 'https:') throw new Error('R2 endpoint must use HTTPS');
    if (this.endpoint.pathname !== '/' || this.endpoint.search || this.endpoint.hash) {
      throw new Error('R2 endpoint must be an origin URL without path, query, or hash');
    }
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(config.bucket)) {
      throw new Error('R2 bucket name is not DNS compatible');
    }
    if (!config.accessKeyId || !config.secretAccessKey) throw new Error('R2 credentials are required');

    this.bucket = config.bucket;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region ?? 'auto';
    this.fetcher = config.fetcher ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  async put(input: PutObjectInput): Promise<StoredObjectMetadata> {
    const body = await collectBody(input.body);
    const actualChecksum = sha256(body);
    if (input.checksumSha256 && normalizeChecksum(input.checksumSha256) !== actualChecksum) {
      throw new Error('Object body SHA-256 does not match the supplied checksum');
    }

    const headers: Record<string, string> = {
      'content-length': String(body.byteLength),
      'x-amz-meta-alsvid-sha256': actualChecksum,
      ...metadataHeaders(input.metadata),
    };
    if (input.contentType) headers['content-type'] = input.contentType;

    const signed = this.signRequest('PUT', input.key, headers, actualChecksum);
    const response = await this.fetcher(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      body,
    });
    await ensureOk(response, 'put object');

    return {
      key: input.key,
      size: body.byteLength,
      etag: trimEtag(response.headers.get('etag')),
      contentType: input.contentType,
      checksumSha256: actualChecksum,
    };
  }

  async head(key: string): Promise<StoredObjectMetadata | null> {
    const signed = this.signRequest('HEAD', key, {}, EMPTY_SHA256);
    const response = await this.fetcher(signed.url, { method: 'HEAD', headers: signed.headers });
    if (response.status === 404) return null;
    await ensureOk(response, 'head object');

    const rawSize = response.headers.get('content-length');
    const size = rawSize === null ? null : Number(rawSize);
    return {
      key,
      size: Number.isFinite(size) ? size : null,
      etag: trimEtag(response.headers.get('etag')),
      contentType: response.headers.get('content-type'),
      checksumSha256: normalizeNullableChecksum(response.headers.get('x-amz-meta-alsvid-sha256')),
    };
  }

  async delete(key: string): Promise<void> {
    const signed = this.signRequest('DELETE', key, {}, EMPTY_SHA256);
    const response = await this.fetcher(signed.url, { method: 'DELETE', headers: signed.headers });
    if (response.status === 404) return;
    await ensureOk(response, 'delete object');
  }

  signedReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return Promise.resolve(this.presign('GET', key, expiresInSeconds, {}));
  }

  signedWriteUrl(key: string, expiresInSeconds: number, contentType: string | null): Promise<string> {
    const headers = contentType ? { 'content-type': contentType } : {};
    return Promise.resolve(this.presign('PUT', key, expiresInSeconds, headers));
  }

  async verifyChecksum(key: string, expectedSha256: string): Promise<boolean> {
    const metadata = await this.head(key);
    if (!metadata?.checksumSha256) return false;
    return metadata.checksumSha256 === normalizeChecksum(expectedSha256);
  }

  private objectUrl(key: string): URL {
    const url = new URL(this.endpoint.toString());
    url.hostname = `${this.bucket}.${this.endpoint.hostname}`;
    url.pathname = canonicalUri(key);
    return url;
  }

  private signRequest(
    method: string,
    key: string,
    extraHeaders: Record<string, string>,
    payloadHash: string,
  ): SignedRequest {
    const now = this.now();
    const { amzDate, dateStamp } = awsDate(now);
    const url = this.objectUrl(key);
    const headers = lowerCaseHeaders({
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extraHeaders,
    });
    const { canonicalHeaders, signedHeaders } = canonicalizeHeaders(headers);
    const canonicalRequest = [
      method,
      url.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256Text(canonicalRequest),
    ].join('\n');
    const signature = signString(this.secretAccessKey, dateStamp, this.region, stringToSign);
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return { url: url.toString(), headers };
  }

  private presign(
    method: string,
    key: string,
    expiresInSeconds: number,
    extraHeaders: Record<string, string>,
  ): string {
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 604800) {
      throw new Error('Presigned URL expiry must be between 1 and 604800 seconds');
    }

    const now = this.now();
    const { amzDate, dateStamp } = awsDate(now);
    const url = this.objectUrl(key);
    const headers = lowerCaseHeaders({ host: url.host, ...extraHeaders });
    const { canonicalHeaders, signedHeaders } = canonicalizeHeaders(headers);
    const scope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const query: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-SignedHeaders': signedHeaders,
    };
    const canonicalQuery = canonicalizeQuery(query);
    const canonicalRequest = [
      method,
      url.pathname,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256Text(canonicalRequest),
    ].join('\n');
    query['X-Amz-Signature'] = signString(this.secretAccessKey, dateStamp, this.region, stringToSign);
    url.search = canonicalizeQuery(query);
    return url.toString();
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

function metadataHeaders(metadata: Readonly<Record<string, string>>): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!normalized) continue;
    headers[`x-amz-meta-${normalized}`] = value.trim();
  }
  return headers;
}

function canonicalUri(key: string): string {
  if (!key || key.startsWith('/')) throw new Error('Object key must be non-empty and relative');
  return `/${key.split('/').map(awsEncode).join('/')}`;
}

function canonicalizeQuery(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function canonicalizeHeaders(headers: Record<string, string>): {
  canonicalHeaders: string;
  signedHeaders: string;
} {
  const entries = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, ' ')] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    canonicalHeaders: `${entries.map(([key, value]) => `${key}:${value}`).join('\n')}\n`,
    signedHeaders: entries.map(([key]) => key).join(';'),
  };
}

function lowerCaseHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function awsDate(value: Date): { amzDate: string; dateStamp: string } {
  const iso = value.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signString(secret: string, dateStamp: string, region: string, stringToSign: string): string {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  return createHmac('sha256', signingKey).update(stringToSign).digest('hex');
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function sha256Text(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeChecksum(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error('SHA-256 checksum must be 64 hexadecimal characters');
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

function trimEtag(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/^"|"$/g, '');
}

async function ensureOk(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const detail = await response.text().catch(() => '');
  throw new Error(`R2 ${action} failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ''}`);
}
