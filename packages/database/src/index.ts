import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export interface QueryExecutor {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
}

export interface TransactionManager {
  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T>;
}

export interface DatabasePort extends QueryExecutor, TransactionManager {
  close(): Promise<void>;
}

export class Database implements DatabasePort {
  readonly pool: Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error('DATABASE_URL is required');
    this.pool = new Pool({ connectionString });
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
    client.on('error', () => {});
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The connection is already gone; the original error is more useful.
      }
      throw error;
    } finally {
      client.release();
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
