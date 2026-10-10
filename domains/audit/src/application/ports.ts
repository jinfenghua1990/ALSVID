import type { QueryExecutor } from '@alsvid/database';
import type { AuditEvent, AuditInput } from '../core/model.js';

export interface AuditRepository {
  record(input: AuditInput, executor?: QueryExecutor): Promise<void>;
  recent(limit: number): Promise<AuditEvent[]>;
}
