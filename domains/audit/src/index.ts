import type { Database, QueryExecutor } from '@alsvid/database';

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditEvent extends AuditInput {
  id: string;
  occurredAt: string;
}

export class AuditService {
  constructor(private readonly database: Database) {}

  async record(input: AuditInput, executor: QueryExecutor = this.database): Promise<void> {
    await executor.query(
      `INSERT INTO audit.events
       (actor_user_id, action, target_type, target_id, request_id, correlation_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        input.actorUserId ?? null,
        input.action,
        input.targetType,
        input.targetId ?? null,
        input.requestId ?? null,
        input.correlationId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async recent(limit = 100): Promise<AuditEvent[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const result = await this.database.query<{
      id: string;
      actor_user_id: string | null;
      action: string;
      target_type: string;
      target_id: string | null;
      request_id: string | null;
      correlation_id: string | null;
      metadata: Record<string, unknown>;
      occurred_at: Date;
    }>(
      `SELECT id, actor_user_id, action, target_type, target_id, request_id, correlation_id, metadata, occurred_at
       FROM audit.events ORDER BY occurred_at DESC LIMIT $1`,
      [safeLimit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      actorUserId: row.actor_user_id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      requestId: row.request_id,
      correlationId: row.correlation_id,
      metadata: row.metadata,
      occurredAt: row.occurred_at.toISOString(),
    }));
  }
}
