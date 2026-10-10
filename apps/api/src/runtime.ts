import { AssetService } from '@alsvid/assets';
import { AuditService } from '@alsvid/audit';
import { Database } from '@alsvid/database';
import { EngineeringService } from '@alsvid/engineering';
import { IdentityService } from '@alsvid/identity';
import { PartnerService } from '@alsvid/partners';
import { ProcurementService } from '@alsvid/procurement';
import { ProductService } from '@alsvid/product';

export const database = new Database();
export const auditService = new AuditService(database);
export const identityService = new IdentityService(database, auditService);
export const partnerService = new PartnerService(database, auditService);
export const productService = new ProductService(database, auditService);
export const engineeringService = new EngineeringService(database, auditService);
export const assetService = new AssetService(database, auditService);
export const procurementService = new ProcurementService(database, auditService);
