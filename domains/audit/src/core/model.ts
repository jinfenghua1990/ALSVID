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
