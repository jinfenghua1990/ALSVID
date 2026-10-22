export const ProductCapability = {
  Read: 'product.read',
  Write: 'product.write',
  Publish: 'product.publish',
} as const;

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type ProductTypeCode = 'BIKE' | 'ACCESSORY' | 'SERVICE_PART';
export type HomepageSlotCode = 'FC1_HERO' | 'FC1_FEATURED' | 'FC2_LAUNCH';
export type HomepageBindingMode = 'AUTO' | 'MANUAL';
export type HomepageBinding = {
  slot_code: HomepageSlotCode; target_model_code: string; mode: HomepageBindingMode;
  manual_model_id: string | null; resolved_model_id: string | null;
  resolved_model_code: string | null; version: number;
};
export type ProductEntityKind = 'model' | 'variant' | 'sku';

export interface ProductRowBase {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProductStatus;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformRow extends ProductRowBase {}

export interface ModelRow extends ProductRowBase {
  platform_id: string | null;
  product_type_code: ProductTypeCode;
}

export interface VariantRow extends ProductRowBase {
  model_id: string;
  attributes: Record<string, unknown>;
}

export interface SkuRow extends ProductRowBase {
  variant_id: string;
  sku: string;
  market_code: string | null;
  color_code: string | null;
  size_code: string | null;
  attributes: Record<string, unknown>;
}

export interface ProductCatalog {
  productTypes: { code: ProductTypeCode; name: string; description: string; status: ProductStatus }[];
  platforms: PlatformRow[];
  models: ModelRow[];
  variants: VariantRow[];
  skus: SkuRow[];
}
