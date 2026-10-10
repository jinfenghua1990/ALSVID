export const ProductCapability = {
  Read: 'product.read',
  Write: 'product.write',
} as const;

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type ProductEntityKind = 'model' | 'variant' | 'sku';

export interface ProductCatalog {
  platforms: any[];
  models: any[];
  variants: any[];
  skus: any[];
}
