export interface EnqueueJobInput {
  queue: string;
  jobType: string;
  payload: unknown;
  idempotencyKey: string | null;
  availableAt: Date | null;
  maxAttempts: number;
  correlationId: string | null;
}

export interface EnqueuedJob {
  id: string;
  queue: string;
  jobType: string;
  createdAt: Date;
}

export interface JobQueuePort {
  enqueue(input: EnqueueJobInput): Promise<EnqueuedJob>;
}
