import { ForbiddenError } from '@alsvid/kernel';
import { postgresErrorCode } from '@alsvid/database';
import { ProductConflictError, ProductNotFoundError, ProductValidationError } from '../core/errors.js';
import { ProductCapability, type HomepageBinding, type HomepageBindingMode, type HomepageSlotCode, type ProductCatalog, type ProductEntityKind, type ProductStatus, type ProductTypeCode } from '../core/model.js';
import { normalizeProductCode, normalizeProductCountry } from '../core/normalization.js';
import type { ProductActor, ProductAuditPort, ProductRepository } from './ports.js';

export class ProductService {
  constructor(private readonly repository: ProductRepository, private readonly audit: ProductAuditPort) {}

  async catalog(actor: ProductActor): Promise<ProductCatalog> {
    requireCapability(actor, ProductCapability.Read);
    return this.repository.catalog();
  }

  async homepageBindings(actor: ProductActor): Promise<HomepageBinding[]> {
    requireCapability(actor, ProductCapability.Read);
    return this.repository.homepageBindings();
  }

  /** Public projection contains only the validated internal model ID and fixed code; no inventory, price or sale status. */
  async publicHomepageBindings(): Promise<Array<{slot: HomepageSlotCode; modelId: string | null; modelCode: string | null}>> {
    const bindings = await this.repository.homepageBindings();
    return bindings.map(row => ({slot:row.slot_code,modelId:row.resolved_model_id,modelCode:row.resolved_model_code}));
  }

  async setHomepageBinding(actor: ProductActor, input: {slot: HomepageSlotCode; mode: HomepageBindingMode; modelId?: string | null; expectedVersion: number}): Promise<HomepageBinding> {
    requireCapability(actor, ProductCapability.Write);
    if (!['FC1_HERO','FC1_FEATURED','FC2_LAUNCH'].includes(input.slot)) throw new ProductValidationError('Unknown homepage slot');
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new ProductValidationError('Expected binding version');
    if (input.mode !== 'AUTO' && input.mode !== 'MANUAL') throw new ProductValidationError('Unknown binding mode');
    const modelId = input.mode === 'MANUAL' ? input.modelId : null;
    if (input.mode === 'MANUAL') {
      if (!modelId || !await this.repository.modelForHomepageSlot(input.slot, modelId)) {
        throw new ProductValidationError('Selected model does not match this homepage slot or is not ACTIVE');
      }
    } else if (input.modelId) {
      throw new ProductValidationError('AUTO mode cannot specify a manual model');
    }
    const updated = await this.repository.updateHomepageBinding({slot:input.slot,mode:input.mode,modelId:modelId ?? null,
      expectedVersion:input.expectedVersion,actorUserId:actor.userId});
    if (!updated) {
      if (!await this.repository.homepageBindingExists(input.slot)) throw new ProductNotFoundError('Homepage slot not found');
      throw new ProductConflictError('Homepage binding changed; reload before saving');
    }
    await this.audit.record({actorUserId:actor.userId,action:'product.homepage_binding_updated',targetType:'product.homepage_slot',
      targetId:input.slot,metadata:{mode:input.mode,modelId:modelId ?? null}});
    return updated;
  }

  async createModel(actor: ProductActor, input: { platformId?: string | null; productTypeCode?: ProductTypeCode; code: string; name: string; description?: string }): Promise<any> {
    requireCapability(actor, ProductCapability.Write);
    const code = normalizeProductCode(input.code);
    const productTypeCode = input.productTypeCode ?? 'BIKE';
    if (!['BIKE','ACCESSORY','SERVICE_PART'].includes(productTypeCode)) throw new ProductValidationError('Unsupported product type');
    if (productTypeCode === 'BIKE' && !input.platformId) throw new ProductValidationError('Bicycle requires technical platform');
    if (productTypeCode !== 'BIKE' && input.platformId) throw new ProductValidationError('Accessory/service part cannot use a bicycle platform');
    if (!input.name?.trim()) throw new ProductValidationError('Model name is required');
    try {
      const row = await this.repository.createModel({ platformId: productTypeCode === 'BIKE' ? input.platformId! : null, productTypeCode, code, name: input.name.trim(), description: input.description?.trim() ?? '', actorUserId: actor.userId });
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
