import { AuditService } from '@alsvid/audit';
import { Database } from '@alsvid/database';
import { IdentityService } from '@alsvid/identity';
import { PartnerService } from '@alsvid/partners';

export const database = new Database();
export const auditService = new AuditService(database);
export const identityService = new IdentityService(database, auditService);
export const partnerService = new PartnerService(database, auditService);
