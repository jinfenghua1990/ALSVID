export const ProductCapability = {
  Read: 'product.read',
  Write: 'product.write',
} as const;

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
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
  platform_id: string;
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
  platforms: PlatformRow[];
  models: ModelRow[];
  variants: VariantRow[];
  skus: SkuRow[];
}
