import { loadPlatformConfig } from '@alsvid/config';
import { Database } from '@alsvid/database';
import { JobWorker, PostgresJobQueue, type JobHandler } from '@alsvid/jobs';
import { JsonConsoleLogger } from '@alsvid/observability';

const config = loadPlatformConfig();
const database = new Database(config.databaseUrl);
const logger = new JsonConsoleLogger({ service: 'alsvid-worker', environment: config.environment });
const queue = new PostgresJobQueue(database);

// Business domains register handlers here through public application contracts.
// The platform worker itself owns polling/leases/retries only; it owns no business rules.
const handlers = new Map<string, JobHandler>();
const worker = new JobWorker(queue, handlers, logger, {
  workerId: config.worker.id,
  queueName: config.worker.queue,
  pollMs: config.worker.pollMs,
  leaseMs: config.worker.leaseMs,
});

const controller = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => controller.abort());

try {
  await worker.start(controller.signal);
} finally {
  await database.close();
}
