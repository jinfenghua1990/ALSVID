import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import type { AuditEvent, AuditInput } from '../core/model.js';
import type { AuditRepository } from '../application/ports.js';

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly database: DatabasePort) {}

  async record(input: AuditInput, executor: QueryExecutor = this.database): Promise<void> {
    await executor.query(
      `INSERT INTO audit.events(actor_user_id,action,target_type,target_id,request_id,correlation_id,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [input.actorUserId ?? null,input.action,input.targetType,input.targetId ?? null,input.requestId ?? null,input.correlationId ?? null,JSON.stringify(input.metadata ?? {})],
    );
  }

  async recent(limit: number): Promise<AuditEvent[]> {
    const result = await this.database.query<any>(
      `SELECT id,actor_user_id,action,target_type,target_id,request_id,correlation_id,metadata,occurred_at
       FROM audit.events ORDER BY occurred_at DESC LIMIT $1`,
      [limit],
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
