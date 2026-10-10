import type { AuditService } from '@alsvid/audit';
import type { Database } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const ProductCapability = {
  Read: 'product.read',
  Write: 'product.write',
} as const;

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export class ProductValidationError extends Error {}
export class ProductNotFoundError extends Error {}
export class ProductConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

export function normalizeProductCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) throw new ProductValidationError('Code must use A-Z, 0-9, _ or -');
  return code;
}

function normalizeCountry(value?: string | null): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new ProductValidationError('marketCode must be ISO alpha-2');
  return code;
}

export interface ProductCatalog {
  platforms: any[];
  models: any[];
  variants: any[];
  skus: any[];
}

export class ProductService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async catalog(actor: AuthContext): Promise<ProductCatalog> {
    requireCapability(actor, ProductCapability.Read);
    const [platforms, models, variants, skus] = await Promise.all([
      this.database.query<any>('SELECT id, code, name, description, status, version, created_at, updated_at FROM product.platforms ORDER BY code'),
      this.database.query<any>('SELECT id, platform_id, code, name, description, status, version, created_at, updated_at FROM product.models ORDER BY code'),
      this.database.query<any>('SELECT id, model_id, code, name, description, attributes, status, version, created_at, updated_at FROM product.variants ORDER BY code'),
      this.database.query<any>('SELECT id, variant_id, sku, name, market_code, color_code, size_code, attributes, status, version, created_at, updated_at FROM product.skus ORDER BY sku'),
    ]);
    return {
      platforms: platforms.rows,
      models: models.rows,
      variants: variants.rows,
      skus: skus.rows.map((row) => ({ ...row, market_code: row.market_code?.trim() ?? null })),
    };
  }

  async createModel(actor: AuthContext, input: { platformId: string; code: string; name: string; description?: string }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    if (!input.name?.trim()) throw new ProductValidationError('Model name is required');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO product.models(platform_id, code, name, description, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
        [input.platformId, code, input.name.trim(), input.description?.trim() ?? '', actor.userId],
      );
      const row = result.rows[0];
      await this.audit.record({ actorUserId: actor.userId, action: 'product.model_created', targetType: 'product.model', targetId: row.id, metadata: { code } });
      return row;
    } catch (error: any) {
      if (error?.code === '23505') throw new ProductConflictError('Model code already exists');
      if (error?.code === '23503') throw new ProductNotFoundError('Platform not found');
      throw error;
    }
  }

  async createVariant(actor: AuthContext, input: { modelId: string; code: string; name: string; description?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    if (!input.name?.trim()) throw new ProductValidationError('Variant name is required');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO product.variants(model_id, code, name, description, attributes, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$6) RETURNING *`,
        [input.modelId, code, input.name.trim(), input.description?.trim() ?? '', JSON.stringify(input.attributes ?? {}), actor.userId],
      );
      const row = result.rows[0];
      await this.audit.record({ actorUserId: actor.userId, action: 'product.variant_created', targetType: 'product.variant', targetId: row.id, metadata: { code } });
      return row;
    } catch (error: any) {
      if (error?.code === '23505') throw new ProductConflictError('Variant code already exists for this model');
      if (error?.code === '23503') throw new ProductNotFoundError('Model not found');
      throw error;
    }
  }

  async createSku(actor: AuthContext, input: { variantId: string; sku: string; name: string; marketCode?: string; colorCode?: string; sizeCode?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const sku = normalizeProductCode(input.sku);
    if (!input.name?.trim()) throw new ProductValidationError('SKU name is required');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO product.skus(variant_id, sku, name, market_code, color_code, size_code, attributes, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8) RETURNING *`,
        [input.variantId, sku, input.name.trim(), normalizeCountry(input.marketCode), input.colorCode?.trim() || null, input.sizeCode?.trim() || null, JSON.stringify(input.attributes ?? {}), actor.userId],
      );
      const row = result.rows[0];
      await this.audit.record({ actorUserId: actor.userId, action: 'product.sku_created', targetType: 'product.sku', targetId: row.id, metadata: { sku } });
      return row;
    } catch (error: any) {
      if (error?.code === '23505') throw new ProductConflictError('SKU already exists');
      if (error?.code === '23503') throw new ProductNotFoundError('Variant not found');
      throw error;
    }
  }

  async updateEntity(actor: AuthContext, entity: 'model' | 'variant' | 'sku', id: string, input: { expectedVersion: number; name?: string; description?: string; status?: ProductStatus; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new ProductValidationError('expectedVersion is required');
    const table = entity === 'model' ? 'models' : entity === 'variant' ? 'variants' : 'skus';
    const result = await this.database.query<any>(
      `UPDATE product.${table}
       SET name = COALESCE($3, name),
           status = COALESCE($4, status),
           ${entity === 'sku' ? "market_code = CASE WHEN $5::boolean THEN $6 ELSE market_code END, color_code = CASE WHEN $7::boolean THEN $8 ELSE color_code END, size_code = CASE WHEN $9::boolean THEN $10 ELSE size_code END," : "description = CASE WHEN $11::boolean THEN $12 ELSE description END,"}
           version = version + 1, updated_by = $13, updated_at = now()
       WHERE id = $1 AND version = $2 RETURNING *`,
      [
        id,
        input.expectedVersion,
        input.name?.trim() || null,
        input.status ?? null,
        entity === 'sku' && input.marketCode !== undefined,
        entity === 'sku' ? normalizeCountry(input.marketCode) : null,
        entity === 'sku' && input.colorCode !== undefined,
        entity === 'sku' ? input.colorCode?.trim() || null : null,
        entity === 'sku' && input.sizeCode !== undefined,
        entity === 'sku' ? input.sizeCode?.trim() || null : null,
        entity !== 'sku' && input.description !== undefined,
        entity !== 'sku' ? input.description?.trim() ?? '' : null,
        actor.userId,
      ],
    );
    if (!result.rows[0]) {
      const exists = await this.database.query(`SELECT 1 FROM product.${table} WHERE id = $1`, [id]);
      if (!exists.rows[0]) throw new ProductNotFoundError(`${entity} not found`);
      throw new ProductConflictError(`${entity} changed since it was loaded`);
    }
    await this.audit.record({ actorUserId: actor.userId, action: `product.${entity}_updated`, targetType: `product.${entity}`, targetId: id });
    return result.rows[0];
  }
}
