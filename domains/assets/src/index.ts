import type { AuditService } from '@alsvid/audit';
import type { Database } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const AssetCapability = { Read: 'asset.read', Write: 'asset.write' } as const;
export class AssetValidationError extends Error {}
export class AssetConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

export function normalizeSha256(value?: string | null): string | null {
  if (!value) return null;
  const checksum = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new AssetValidationError('checksumSha256 must contain 64 hex characters');
  return checksum;
}

export class AssetService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async register(actor: AuthContext, input: { provider: string; bucket: string; objectKey: string; checksumSha256?: string; contentType?: string; byteSize?: number; originalFilename?: string; visibility?: 'PRIVATE' | 'INTERNAL' | 'PUBLIC'; classification?: 'PRODUCT_MEDIA' | 'ENGINEERING_DOC' | 'MANUAL' | 'CERTIFICATE' | 'OTHER'; metadata?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, AssetCapability.Write);
    if (!input.provider?.trim() || !input.bucket?.trim() || !input.objectKey?.trim()) throw new AssetValidationError('provider, bucket and objectKey are required');
    if (input.byteSize !== undefined && (!Number.isSafeInteger(input.byteSize) || input.byteSize < 0)) throw new AssetValidationError('byteSize must be a non-negative integer');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO assets.objects(provider,bucket,object_key,checksum_sha256,content_type,byte_size,original_filename,visibility,classification,metadata,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) RETURNING *`,
        [input.provider.trim(), input.bucket.trim(), input.objectKey.trim(), normalizeSha256(input.checksumSha256), input.contentType?.trim() || null, input.byteSize ?? null, input.originalFilename?.trim() || null, input.visibility ?? 'PRIVATE', input.classification ?? 'OTHER', JSON.stringify(input.metadata ?? {}), actor.userId],
      );
      await this.audit.record({ actorUserId: actor.userId, action: 'asset.registered', targetType: 'asset', targetId: result.rows[0].id });
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new AssetConflictError('Object key already registered for this provider/bucket');
      throw error;
    }
  }

  async link(actor: AuthContext, assetId: string, input: { entityType: string; entityId: string; purpose?: string; sortOrder?: number }): Promise<any> {
    requireCapability(actor, AssetCapability.Write);
    try {
      const result = await this.database.query<any>(
        `INSERT INTO assets.links(asset_id,entity_type,entity_id,purpose,sort_order,created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [assetId, input.entityType, input.entityId, input.purpose?.trim().toUpperCase() || 'GENERAL', input.sortOrder ?? 0, actor.userId],
      );
      await this.audit.record({ actorUserId: actor.userId, action: 'asset.linked', targetType: input.entityType, targetId: input.entityId, metadata: { assetId, purpose: input.purpose ?? 'GENERAL' } });
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new AssetConflictError('Asset link already exists');
      throw error;
    }
  }

  async forEntity(actor: AuthContext, entityType: string, entityId: string): Promise<any[]> {
    requireCapability(actor, AssetCapability.Read);
    const result = await this.database.query<any>(
      `SELECT o.*, l.purpose, l.sort_order FROM assets.links l JOIN assets.objects o ON o.id = l.asset_id
       WHERE l.entity_type = $1 AND l.entity_id = $2 ORDER BY l.sort_order, o.created_at`,
      [entityType, entityId],
    );
    return result.rows;
  }
}
