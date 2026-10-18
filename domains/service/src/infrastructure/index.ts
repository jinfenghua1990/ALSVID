import type { DatabasePort } from '@alsvid/database';
import { ServiceCaseService } from '../application/service-case-service.js';
import type { ServiceCaseAuditPort } from '../application/ports.js';
import { PostgresServiceCaseRepository } from './postgres-service-case-repository.js';
export function createServiceCaseService(database:DatabasePort,audit:ServiceCaseAuditPort):ServiceCaseService {
 return new ServiceCaseService(new PostgresServiceCaseRepository(database),audit);
}
