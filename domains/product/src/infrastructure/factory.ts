import type { DatabasePort } from '@alsvid/database';
import { ProductService } from '../application/product-service.js';
import type { ProductAuditPort } from '../application/ports.js';
import { PostgresProductRepository } from './postgres-product-repository.js';

export function createProductService(database: DatabasePort, audit: ProductAuditPort): ProductService {
  return new ProductService(new PostgresProductRepository(database), audit);
}
