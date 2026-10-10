import { ForbiddenError } from '@alsvid/kernel';
import { postgresErrorCode } from '@alsvid/database';
import { ProductConflictError, ProductNotFoundError, ProductValidationError } from '../core/errors.js';
import { ProductCapability, type ProductCatalog, type ProductEntityKind, type ProductStatus } from '../core/model.js';
import { normalizeProductCode, normalizeProductCountry } from '../core/normalization.js';
import type { ProductActor, ProductAuditPort, ProductRepository } from './ports.js';

export class ProductService {
  constructor(private readonly repository: ProductRepository, private readonly audit: ProductAuditPort) {}

  async catalog(actor: ProductActor): Promise<ProductCatalog> {
    requireCapability(actor, ProductCapability.Read);
    return this.repository.catalog();
  }

  async createModel(actor: ProductActor, input: { platformId: string; code: string; name: string; description?: string }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    if (!input.name?.trim()) throw new ProductValidationError('Model name is required');
    try {
      const row = await this.repository.createModel({ platformId: input.platformId, code, name: input.name.trim(), description: input.description?.trim() ?? '', actorUserId: actor.userId });
      await this.audit.record({ actorUserId: actor.userId, action: 'product.model_created', targetType: 'product.model', targetId: row.id, metadata: { code } });
      return row;
    } catch (error) {
      mapCreateError(error, 'Model code already exists', 'Platform not found');
    }
  }

  async createVariant(actor: ProductActor, input: { modelId: string; code: string; name: string; description?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    if (!input.name?.trim()) throw new ProductValidationError('Variant name is required');
    try {
      const row = await this.repository.createVariant({ modelId: input.modelId, code, name: input.name.trim(), description: input.description?.trim() ?? '', attributes: input.attributes ?? {}, actorUserId: actor.userId });
      await this.audit.record({ actorUserId: actor.userId, action: 'product.variant_created', targetType: 'product.variant', targetId: row.id, metadata: { code } });
      return row;
    } catch (error) {
      mapCreateError(error, 'Variant code already exists for this model', 'Model not found');
    }
  }

  async createSku(actor: ProductActor, input: { variantId: string; sku: string; name: string; marketCode?: string; colorCode?: string; sizeCode?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const sku = normalizeProductCode(input.sku);
    if (!input.name?.trim()) throw new ProductValidationError('SKU name is required');
    try {
      const row = await this.repository.createSku({
        variantId: input.variantId,
        sku,
        name: input.name.trim(),
        marketCode: normalizeProductCountry(input.marketCode),
        colorCode: input.colorCode?.trim() || null,
        sizeCode: input.sizeCode?.trim() || null,
        attributes: input.attributes ?? {},
        actorUserId: actor.userId,
      });
      await this.audit.record({ actorUserId: actor.userId, action: 'product.sku_created', targetType: 'product.sku', targetId: row.id, metadata: { sku } });
      return row;
    } catch (error) {
      mapCreateError(error, 'SKU already exists', 'Variant not found');
    }
  }

  async updateEntity(actor: ProductActor, entity: ProductEntityKind, id: string, input: { expectedVersion: number; name?: string; description?: string; status?: ProductStatus; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new ProductValidationError('expectedVersion is required');
    const row = await this.repository.update({
      entity,
      id,
      expectedVersion: input.expectedVersion,
      name: input.name?.trim() || null,
      status: input.status ?? null,
      descriptionProvided: input.description !== undefined,
      description: input.description?.trim() ?? '',
      marketCodeProvided: input.marketCode !== undefined,
      marketCode: normalizeProductCountry(input.marketCode),
      colorCodeProvided: input.colorCode !== undefined,
      colorCode: input.colorCode?.trim() || null,
      sizeCodeProvided: input.sizeCode !== undefined,
      sizeCode: input.sizeCode?.trim() || null,
      actorUserId: actor.userId,
    });
    if (!row) {
      if (!await this.repository.exists(entity, id)) throw new ProductNotFoundError(`${entity} not found`);
      throw new ProductConflictError(`${entity} changed since it was loaded`);
    }
    await this.audit.record({ actorUserId: actor.userId, action: `product.${entity}_updated`, targetType: `product.${entity}`, targetId: id });
    return row;
  }
}

function requireCapability(actor: ProductActor, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new ForbiddenError('PRODUCT_FORBIDDEN', `Missing permission: ${capability}`);
}

function mapCreateError(error: unknown, duplicateMessage: string, parentMessage: string): never {
  const code = postgresErrorCode(error);
  if (code === '23505') throw new ProductConflictError(duplicateMessage);
  if (code === '23503') throw new ProductNotFoundError(parentMessage);
  throw error;
}
