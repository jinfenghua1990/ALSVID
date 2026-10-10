import type { QueryExecutor } from '@alsvid/database';
import type { AuditEvent, AuditInput } from '../core/model.js';
import type { AuditRepository } from './ports.js';

export class AuditApplicationService {
  constructor(private readonly repository: AuditRepository) {}

  record(input: AuditInput, executor?: QueryExecutor): Promise<void> {
    return this.repository.record(input, executor);
  }

  recent(limit = 100): Promise<AuditEvent[]> {
    return this.repository.recent(Math.max(1, Math.min(limit, 500)));
  }
}
