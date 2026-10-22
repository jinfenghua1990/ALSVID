import type { HomepageBinding, HomepageBindingMode, HomepageSlotCode, ProductCatalog, ProductEntityKind, ProductStatus, ProductTypeCode } from '../core/model.js';
import type { PublicationRow,PublicationStatus,PublicationDraft } from '../core/publication.js';

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
  platformId: string | null;
  productTypeCode: ProductTypeCode;
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
  publications(): Promise<PublicationRow[]>;
  publishedPublications(): Promise<PublicationRow[]>;
  publication(modelId:string): Promise<PublicationRow | null>;
  createPublication(modelId:string,actorUserId:string): Promise<PublicationRow | null>;
  savePublication(modelId:string,expectedVersion:number,body:PublicationDraft,imagePath:string,actorUserId:string): Promise<PublicationRow | null>;
  transitionPublication(modelId:string,expectedVersion:number,fromStatus:PublicationStatus,toStatus:PublicationStatus,actorUserId:string): Promise<PublicationRow | null>;
  homepageBindings(): Promise<HomepageBinding[]>;
  updateHomepageBinding(input: {slot: HomepageSlotCode; mode: HomepageBindingMode; modelId: string | null; expectedVersion: number; actorUserId: string}): Promise<HomepageBinding | null>;
  homepageBindingExists(slot: HomepageSlotCode): Promise<boolean>;
  modelForHomepageSlot(slot: HomepageSlotCode, modelId: string): Promise<boolean>;
  catalog(): Promise<ProductCatalog>;
  createModel(input: CreateModelRecord): Promise<any>;
  createVariant(input: CreateVariantRecord): Promise<any>;
  createSku(input: CreateSkuRecord): Promise<any>;
  update(input: UpdateProductRecord): Promise<any | null>;
  exists(entity: ProductEntityKind, id: string): Promise<boolean>;
}
