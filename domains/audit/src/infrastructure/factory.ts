import type { DatabasePort } from '@alsvid/database';
import { AuditApplicationService } from '../application/audit-service.js';
import { PostgresAuditRepository } from './postgres-audit-repository.js';

// Temporary compatibility composition facade while legacy domains are being encapsulated.
// New code should prefer createAuditService().
export class AuditService extends AuditApplicationService {
  constructor(database: DatabasePort) {
    super(new PostgresAuditRepository(database));
  }
}

export function createAuditService(database: DatabasePort): AuditService {
  return new AuditService(database);
}
