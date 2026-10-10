import type { Clock } from './clock.js';
import { systemClock } from './clock.js';

export type ActorKind = 'USER' | 'SYSTEM' | 'INTEGRATION';

export interface ActorRef {
  kind: ActorKind;
  id: string | null;
  displayName: string | null;
}

export interface OperationContext {
  actor: ActorRef;
  correlationId: string;
  causationId: string | null;
  requestId: string | null;
  occurredAt: Date;
}

export function createOperationContext(input: {
  actor: ActorRef;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  clock?: Clock;
}): OperationContext {
  if (!input.correlationId.trim()) throw new Error('correlationId is required');
  return {
    actor: input.actor,
    correlationId: input.correlationId.trim(),
    causationId: input.causationId ?? null,
    requestId: input.requestId ?? null,
    occurredAt: (input.clock ?? systemClock).now(),
  };
}
