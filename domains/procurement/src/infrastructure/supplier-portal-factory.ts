import type { DatabasePort } from '@alsvid/database';
import { SupplierPortalService, type SupplierPortalAuditPort } from '../application/supplier-portal-service.js';
import { PostgresSupplierPortalRepository } from './postgres-supplier-portal-repository.js';
export function createSupplierPortalService(db:DatabasePort,audit:SupplierPortalAuditPort){
 return new SupplierPortalService(new PostgresSupplierPortalRepository(db),audit);
}
