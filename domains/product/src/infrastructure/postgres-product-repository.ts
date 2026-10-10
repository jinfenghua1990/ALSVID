import type { DatabasePort } from '@alsvid/database';
import type { ProductCatalog, ProductEntityKind } from '../core/model.js';
import type { CreateModelRecord, CreateSkuRecord, CreateVariantRecord, ProductRepository, UpdateProductRecord } from '../application/ports.js';

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly database: DatabasePort) {}

  async catalog(): Promise<ProductCatalog> {
    const [platforms, models, variants, skus] = await Promise.all([
      this.database.query<any>('SELECT id, code, name, description, status, version, created_at, updated_at FROM product.platforms ORDER BY code'),
      this.database.query<any>('SELECT id, platform_id, code, name, description, status, version, created_at, updated_at FROM product.models ORDER BY code'),
      this.database.query<any>('SELECT id, model_id, code, name, description, attributes, status, version, created_at, updated_at FROM product.variants ORDER BY code'),
      this.database.query<any>('SELECT id, variant_id, sku, name, market_code, color_code, size_code, attributes, status, version, created_at, updated_at FROM product.skus ORDER BY sku'),
    ]);
    return { platforms: platforms.rows, models: models.rows, variants: variants.rows, skus: skus.rows.map((row) => ({ ...row, market_code: row.market_code?.trim() ?? null })) };
  }

  async createModel(input: CreateModelRecord): Promise<any> {
    const result = await this.database.query<any>(
      `INSERT INTO product.models(platform_id,code,name,description,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
      [input.platformId, input.code, input.name, input.description, input.actorUserId],
    );
    return result.rows[0];
  }

  async createVariant(input: CreateVariantRecord): Promise<any> {
    const result = await this.database.query<any>(
      `INSERT INTO product.variants(model_id,code,name,description,attributes,created_by,updated_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$6) RETURNING *`,
      [input.modelId, input.code, input.name, input.description, JSON.stringify(input.attributes), input.actorUserId],
    );
    return result.rows[0];
  }

  async createSku(input: CreateSkuRecord): Promise<any> {
    const result = await this.database.query<any>(
      `INSERT INTO product.skus(variant_id,sku,name,market_code,color_code,size_code,attributes,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8) RETURNING *`,
      [input.variantId, input.sku, input.name, input.marketCode, input.colorCode, input.sizeCode, JSON.stringify(input.attributes), input.actorUserId],
    );
    return result.rows[0];
  }

  async update(input: UpdateProductRecord): Promise<any | null> {
    if (input.entity === 'sku') {
      const result = await this.database.query<any>(
        `UPDATE product.skus SET name=COALESCE($3,name),status=COALESCE($4,status),
         market_code=CASE WHEN $5::boolean THEN $6 ELSE market_code END,
         color_code=CASE WHEN $7::boolean THEN $8 ELSE color_code END,
         size_code=CASE WHEN $9::boolean THEN $10 ELSE size_code END,
         version=version+1,updated_by=$11,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *`,
        [input.id,input.expectedVersion,input.name,input.status,input.marketCodeProvided,input.marketCode,input.colorCodeProvided,input.colorCode,input.sizeCodeProvided,input.sizeCode,input.actorUserId],
      );
      return result.rows[0] ?? null;
    }
    const table = input.entity === 'model' ? 'models' : 'variants';
    const result = await this.database.query<any>(
      `UPDATE product.${table} SET name=COALESCE($3,name),status=COALESCE($4,status),
       description=CASE WHEN $5::boolean THEN $6 ELSE description END,
       version=version+1,updated_by=$7,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *`,
      [input.id,input.expectedVersion,input.name,input.status,input.descriptionProvided,input.description,input.actorUserId],
    );
    return result.rows[0] ?? null;
  }

  async exists(entity: ProductEntityKind, id: string): Promise<boolean> {
    const table = entity === 'model' ? 'models' : entity === 'variant' ? 'variants' : 'skus';
    const result = await this.database.query(`SELECT 1 FROM product.${table} WHERE id=$1`, [id]);
    return Boolean(result.rows[0]);
  }
}
