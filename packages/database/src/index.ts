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
  }

  query<R extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<R>> {
    return this.pool.query<R>(text, values);
  }

  async transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
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
