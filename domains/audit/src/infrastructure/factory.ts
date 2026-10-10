import type { DatabasePort } from '@alsvid/database';
import { AuditService } from '../application/audit-service.js';
import { PostgresAuditRepository } from './postgres-audit-repository.js';

export function createAuditService(database: DatabasePort): AuditService {
  return new AuditService(new PostgresAuditRepository(database));
}
