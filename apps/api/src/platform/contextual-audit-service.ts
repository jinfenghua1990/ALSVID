import type { AuditEvent, AuditInput, AuditService } from '@alsvid/audit';
import type { QueryExecutor } from '@alsvid/database';
import { currentApiRequestContext } from './request-context.js';

export class ContextualAuditService {
  constructor(private readonly delegate: AuditService) {}

  record(input: AuditInput, executor?: QueryExecutor): Promise<void> {
    const context = currentApiRequestContext();
    return this.delegate.record(
      {
        ...input,
        requestId: input.requestId ?? context?.requestId ?? null,
        correlationId: input.correlationId ?? context?.correlationId ?? null,
      },
      executor,
    );
  }

  recent(limit = 100): Promise<AuditEvent[]> {
    return this.delegate.recent(limit);
  }
}
