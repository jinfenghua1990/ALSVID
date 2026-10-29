import { Pool, types, type QueryResult, type QueryResultRow } from 'pg';

// PostgreSQL DATE represents a calendar date, not an instant in time. Returning it
// as a string prevents node-postgres from applying the host timezone and shifting
// the date when code serializes a JavaScript Date back to ISO.
types.setTypeParser(1082, (value: string) => value);

export interface QueryExecutor {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
}

export interface TransactionManager {
  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T>;
}

export interface DatabasePort extends QueryExecutor, TransactionManager {
  close(): Promise<void>;
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Invalid database pool setting: ${value}`);
  return parsed;
}

// pg's defaults wait forever for a free connection and keep an unbounded number
// of sockets open per instance, so one slow query turns into a request pile-up.
export class Database implements DatabasePort {
  readonly pool: Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error('DATABASE_URL is required');
    this.pool = new Pool({
      connectionString,
      max: positiveInt(process.env.DATABASE_POOL_MAX, 10),
      idleTimeoutMillis: positiveInt(process.env.DATABASE_IDLE_TIMEOUT_MS, 30_000),
      connectionTimeoutMillis: positiveInt(process.env.DATABASE_CONNECT_TIMEOUT_MS, 10_000),
      keepAlive: true,
      application_name: `alsvid-${process.env.K_SERVICE ?? process.env.SERVICE_NAME ?? 'local'}`,
    });
    // Serverless providers such as Neon drop idle connections; pg surfaces
    // these as 'error' events which terminate the process when unhandled.
    // Log them and let pg replace the connection on the next checkout.
    this.pool.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] database idle-client error:`, error instanceof Error ? error.message : error);
    });
  }

  query<R extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<R>> {
    return this.pool.query<R>(text, values);
  }

  async transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let discardClient = false;
    const onClientError = () => { discardClient = true; };
    client.on('error', onClientError);
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        discardClient = true;
        // The connection is already gone; the original error is more useful.
      }
      throw error;
    } finally {
      client.removeListener('error', onClientError);
      client.release(discardClient);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function postgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}
