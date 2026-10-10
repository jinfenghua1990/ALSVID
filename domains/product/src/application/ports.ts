import type { ProductCatalog, ProductEntityKind, ProductStatus } from '../core/model.js';

export interface ProductActor {
  userId: string;
  permissions: readonly string[];
}

export interface ProductAuditPort {
  record(input: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface CreateModelRecord {
  platformId: string;
  code: string;
  name: string;
  description: string;
  actorUserId: string;
}

export interface CreateVariantRecord {
  modelId: string;
  code: string;
  name: string;
  description: string;
  attributes: Record<string, unknown>;
  actorUserId: string;
}

export interface CreateSkuRecord {
  variantId: string;
  sku: string;
  name: string;
  marketCode: string | null;
  colorCode: string | null;
  sizeCode: string | null;
  attributes: Record<string, unknown>;
  actorUserId: string;
}

export interface UpdateProductRecord {
  entity: ProductEntityKind;
  id: string;
  expectedVersion: number;
  name: string | null;
  status: ProductStatus | null;
  descriptionProvided: boolean;
  description: string;
  marketCodeProvided: boolean;
  marketCode: string | null;
  colorCodeProvided: boolean;
  colorCode: string | null;
  sizeCodeProvided: boolean;
  sizeCode: string | null;
  actorUserId: string;
}

export interface ProductRepository {
  catalog(): Promise<ProductCatalog>;
  createModel(input: CreateModelRecord): Promise<any>;
  createVariant(input: CreateVariantRecord): Promise<any>;
  createSku(input: CreateSkuRecord): Promise<any>;
  update(input: UpdateProductRecord): Promise<any | null>;
  exists(entity: ProductEntityKind, id: string): Promise<boolean>;
}
