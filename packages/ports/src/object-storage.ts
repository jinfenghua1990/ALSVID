export interface StoredObjectMetadata {
  key: string;
  size: number | null;
  etag: string | null;
  contentType: string | null;
  checksumSha256: string | null;
}

export interface PutObjectInput {
  key: string;
  body: Uint8Array | AsyncIterable<Uint8Array>;
  contentType: string | null;
  checksumSha256: string | null;
  metadata: Readonly<Record<string, string>>;
}

export interface ObjectStoragePort {
  put(input: PutObjectInput): Promise<StoredObjectMetadata>;
  head(key: string): Promise<StoredObjectMetadata | null>;
  delete(key: string): Promise<void>;
  signedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  signedWriteUrl(key: string, expiresInSeconds: number, contentType: string | null): Promise<string>;
}
