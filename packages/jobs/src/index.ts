import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import type { Logger } from '@alsvid/observability';
import type { EnqueueJobInput, EnqueuedJob, JobQueuePort } from '@alsvid/ports';

export interface ClaimedJob {
  id: string;
  queue: string;
  jobType: string;
  payload: unknown;
  attemptCount: number;
  maxAttempts: number;
  correlationId: string | null;
}

interface JobRow {
  id: string;
  queue: string;
  job_type: string;
  payload: unknown;
  attempt_count: number;
  max_attempts: number;
  correlation_id: string | null;
  created_at: Date;
}

export class PostgresJobQueue implements JobQueuePort {
  constructor(private readonly database: DatabasePort) {}

  async enqueue(input: EnqueueJobInput): Promise<EnqueuedJob> {
    if (!input.queue.trim() || !input.jobType.trim()) throw new Error('queue and jobType are required');
    if (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1) throw new Error('maxAttempts must be a positive integer');
    const result = await this.database.query<JobRow>(
      `INSERT INTO platform.jobs(queue,job_type,payload,idempotency_key,available_at,max_attempts,correlation_id)
       VALUES ($1,$2,$3::jsonb,$4,COALESCE($5,now()),$6,$7)
       ON CONFLICT (queue,idempotency_key) WHERE idempotency_key IS NOT NULL
       DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
       RETURNING id,queue,job_type,payload,attempt_count,max_attempts,correlation_id,created_at`,
      [input.queue.trim(), input.jobType.trim(), JSON.stringify(input.payload ?? null), input.idempotencyKey, input.availableAt, input.maxAttempts, input.correlationId],
    );
    const row = result.rows[0]!;
    return { id: row.id, queue: row.queue, jobType: row.job_type, createdAt: row.created_at };
  }

  async claim(workerId: string, queue: string, acceptedTypes: readonly string[]): Promise<ClaimedJob | null> {
    if (acceptedTypes.length === 0) return null;
    return this.database.transaction(async (tx) => {
      const result = await tx.query<JobRow>(
        `WITH candidate AS (
           SELECT id FROM platform.jobs
           WHERE queue=$1 AND status='PENDING' AND available_at<=now()
             AND attempt_count<max_attempts AND job_type=ANY($2::text[])
           ORDER BY priority DESC,available_at,created_at,id
           FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE platform.jobs j
         SET status='RUNNING',locked_by=$3,locked_at=now(),attempt_count=j.attempt_count+1,updated_at=now()
         FROM candidate c WHERE j.id=c.id
         RETURNING j.id,j.queue,j.job_type,j.payload,j.attempt_count,j.max_attempts,j.correlation_id,j.created_at`,
        [queue, acceptedTypes, workerId],
      );
      return this.toClaimed(result.rows[0]);
    });
  }

  async complete(jobId: string, workerId: string): Promise<void> {
    const result = await this.database.query(
      `UPDATE platform.jobs SET status='COMPLETED',completed_at=now(),locked_at=NULL,locked_by=NULL,updated_at=now()
       WHERE id=$1 AND status='RUNNING' AND locked_by=$2`,
      [jobId, workerId],
    );
    if (result.rowCount !== 1) throw new Error('Job completion lease mismatch');
  }

  async fail(job: ClaimedJob, workerId: string, error: unknown, retryDelayMs: number): Promise<void> {
    const terminal = job.attemptCount >= job.maxAttempts;
    const message = error instanceof Error ? error.message : String(error);
    const result = await this.database.query(
      `UPDATE platform.jobs
       SET status=$3,last_error=$4,available_at=CASE WHEN $3='PENDING' THEN now()+($5::text||' milliseconds')::interval ELSE available_at END,
           failed_at=CASE WHEN $3='FAILED' THEN now() ELSE failed_at END,locked_at=NULL,locked_by=NULL,updated_at=now()
       WHERE id=$1 AND status='RUNNING' AND locked_by=$2`,
      [job.id, workerId, terminal ? 'FAILED' : 'PENDING', message.slice(0, 4000), Math.max(0, retryDelayMs)],
    );
    if (result.rowCount !== 1) throw new Error('Job failure lease mismatch');
  }

  async recoverStale(leaseMs: number): Promise<number> {
    const result = await this.database.query(
      `UPDATE platform.jobs
       SET status=CASE WHEN attempt_count>=max_attempts THEN 'FAILED' ELSE 'PENDING' END,
           failed_at=CASE WHEN attempt_count>=max_attempts THEN now() ELSE failed_at END,
           last_error=COALESCE(last_error,'Worker lease expired'),locked_at=NULL,locked_by=NULL,updated_at=now()
       WHERE status='RUNNING' AND locked_at < now()-($1::text||' milliseconds')::interval`,
      [Math.max(1, leaseMs)],
    );
    return result.rowCount ?? 0;
  }

  private toClaimed(row: JobRow | undefined): ClaimedJob | null {
    if (!row) return null;
    return {
      id: row.id,
      queue: row.queue,
      jobType: row.job_type,
      payload: row.payload,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      correlationId: row.correlation_id,
    };
  }
}

export interface JobHandlerContext {
  jobId: string;
  attempt: number;
  correlationId: string | null;
}

export type JobHandler = (payload: unknown, context: JobHandlerContext) => Promise<void>;

export class JobWorker {
  constructor(
    private readonly queue: PostgresJobQueue,
    private readonly handlers: ReadonlyMap<string, JobHandler>,
    private readonly logger: Logger,
    private readonly options: { workerId: string; queueName: string; pollMs: number; leaseMs: number },
  ) {}

  async runOnce(): Promise<boolean> {
    const acceptedTypes = [...this.handlers.keys()];
    const job = await this.queue.claim(this.options.workerId, this.options.queueName, acceptedTypes);
    if (!job) return false;
    const logger = this.logger.child({ jobId: job.id, jobType: job.jobType, attempt: job.attemptCount, correlationId: job.correlationId });
    const handler = this.handlers.get(job.jobType);
    if (!handler) return false;
    try {
      await handler(job.payload, { jobId: job.id, attempt: job.attemptCount, correlationId: job.correlationId });
      await this.queue.complete(job.id, this.options.workerId);
      logger.info('job.completed');
    } catch (error) {
      const retryDelayMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attemptCount - 1));
      await this.queue.fail(job, this.options.workerId, error, retryDelayMs);
      logger.error('job.failed', { error: error instanceof Error ? error.message : String(error), retryDelayMs });
    }
    return true;
  }

  async start(signal: AbortSignal): Promise<void> {
    await this.queue.recoverStale(this.options.leaseMs);
    this.logger.info('worker.started', { workerId: this.options.workerId, queue: this.options.queueName, handlerCount: this.handlers.size });
    while (!signal.aborted) {
      const processed = await this.runOnce();
      if (!processed) await sleep(this.options.pollMs, signal);
    }
    this.logger.info('worker.stopped', { workerId: this.options.workerId });
  }
}

async function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

export type { QueryExecutor };
