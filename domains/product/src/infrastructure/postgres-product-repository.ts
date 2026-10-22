import type { DatabasePort } from '@alsvid/database';
import type { HomepageBinding, ProductCatalog, ProductEntityKind } from '../core/model.js';
import type { CreateModelRecord, CreateSkuRecord, CreateVariantRecord, ProductRepository, UpdateProductRecord } from '../application/ports.js';

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly database: DatabasePort) {}

  async catalog(): Promise<ProductCatalog> {
    const [platforms, models, variants, skus, productTypes] = await Promise.all([
      this.database.query<any>('SELECT id, code, name, description, status, version, created_at, updated_at FROM product.platforms ORDER BY code'),
      this.database.query<any>('SELECT id, platform_id, product_type_code, code, name, description, status, version, created_at, updated_at FROM product.models ORDER BY code'),
      this.database.query<any>('SELECT id, model_id, code, name, description, attributes, status, version, created_at, updated_at FROM product.variants ORDER BY code'),
      this.database.query<any>('SELECT id, variant_id, sku, name, market_code, color_code, size_code, attributes, status, version, created_at, updated_at FROM product.skus ORDER BY sku'),
      this.database.query<any>('SELECT code,name,description,status FROM product.product_types ORDER BY code'),
    ]);
    return { productTypes: productTypes.rows, platforms: platforms.rows, models: models.rows, variants: variants.rows, skus: skus.rows.map((row) => ({ ...row, market_code: row.market_code?.trim() ?? null })) };
  }


  async homepageBindings(): Promise<HomepageBinding[]> {
    const result = await this.database.query<any>(`
      SELECT h.slot_code,h.target_model_code,h.mode,h.manual_model_id,h.version,
             m.id AS resolved_model_id,m.code AS resolved_model_code
      FROM product.homepage_product_bindings h
      LEFT JOIN product.models m ON m.code=h.target_model_code
        AND m.status='ACTIVE' AND m.product_type_code='BIKE'
        AND (h.mode='AUTO' OR m.id=h.manual_model_id)
      ORDER BY h.slot_code`);
    return result.rows as HomepageBinding[];
  }

  async homepageBindingExists(slot: string): Promise<boolean> {
    const result = await this.database.query('SELECT 1 FROM product.homepage_product_bindings WHERE slot_code=$1', [slot]);
    return result.rows.length > 0;
  }

  async modelForHomepageSlot(slot: string, modelId: string): Promise<boolean> {
    const result = await this.database.query(`
      SELECT 1 FROM product.homepage_product_bindings h
      JOIN product.models m ON m.id=$2 AND m.code=h.target_model_code
      WHERE h.slot_code=$1 AND m.status='ACTIVE' AND m.product_type_code='BIKE'`, [slot, modelId]);
    return result.rows.length > 0;
  }

  async updateHomepageBinding(input: {slot: string; mode: string; modelId: string | null; expectedVersion: number; actorUserId: string}): Promise<HomepageBinding | null> {
    const result = await this.database.query(`
      UPDATE product.homepage_product_bindings
      SET mode=$3,manual_model_id=$4,version=version+1,updated_by=$5,updated_at=now()
      WHERE slot_code=$1 AND version=$2 RETURNING slot_code`,
      [input.slot,input.expectedVersion,input.mode,input.modelId,input.actorUserId]);
    if (!result.rows.length) return null;
    const bindings = await this.homepageBindings();
    return bindings.find(binding => binding.slot_code === input.slot) ?? null;
  }

  async createModel(input: CreateModelRecord): Promise<any> {
    const result = await this.database.query<any>(
      `INSERT INTO product.models(platform_id,product_type_code,code,name,description,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
      [input.platformId, input.productTypeCode, input.code, input.name, input.description, input.actorUserId],
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
