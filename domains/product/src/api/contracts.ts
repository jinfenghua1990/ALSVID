import type { ProductStatus } from '../core/model.js';

export interface CreateModelRequest { platformId: string; code: string; name: string; description?: string; }
export interface CreateVariantRequest { modelId: string; code: string; name: string; description?: string; attributes?: Record<string, unknown>; }
export interface CreateSkuRequest { variantId: string; sku: string; name: string; marketCode?: string; colorCode?: string; sizeCode?: string; attributes?: Record<string, unknown>; }
export interface UpdateProductRequest { expectedVersion: number; name?: string; description?: string; status?: ProductStatus; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null; }
