import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Database } from './index.js';

const database = new Database();
const migrationsUrl = new URL('../migrations/', import.meta.url);

function checksumOf(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

async function migrate(): Promise<void> {
  // pg_advisory_lock is session-scoped: the lock and the unlock must run on the
  // same connection, so the whole migration holds one dedicated client instead
  // of borrowing a possibly different pooled connection for each statement.
  const lockClient = await database.pool.connect();

  try {
    await lockClient.query('SELECT pg_advisory_lock(hashtext($1))', ['alsvid-schema-migrations']);

    try {
      await lockClient.query('CREATE SCHEMA IF NOT EXISTS platform');
      await lockClient.query(`
        CREATE TABLE IF NOT EXISTS platform.schema_migrations (
          filename text PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      // Rows written before this column existed keep a NULL checksum and are
      // adopted on the next run instead of failing.
      await lockClient.query('ALTER TABLE platform.schema_migrations ADD COLUMN IF NOT EXISTS checksum text');

      const files = (await readdir(migrationsUrl)).filter((file) => file.endsWith('.sql')).sort();
      const applied = await lockClient.query<{ filename: string; checksum: string | null }>(
        'SELECT filename, checksum FROM platform.schema_migrations',
      );
      const appliedChecksums = new Map(applied.rows.map((row) => [row.filename, row.checksum]));

      for (const filename of files) {
        const sql = await readFile(new URL(filename, migrationsUrl), 'utf8');
        const checksum = checksumOf(sql);
        const previous = appliedChecksums.get(filename);

        if (previous !== undefined) {
          // Editing an applied migration silently diverges databases across
          // environments; a new migration must carry the change instead.
          if (previous !== null && previous !== checksum) {
            throw new Error(
              `Migration ${filename} changed after it was applied (expected ${previous.slice(0, 12)}, got ${checksum.slice(0, 12)}). Add a new migration instead of editing applied history.`,
            );
          }
          if (previous === null) {
            await lockClient.query('UPDATE platform.schema_migrations SET checksum=$2 WHERE filename=$1', [filename, checksum]);
          }
          continue;
        }

        await database.transaction(async (client) => {
          await client.query(sql);
          await client.query('INSERT INTO platform.schema_migrations(filename,checksum) VALUES ($1,$2)', [filename, checksum]);
        });
        console.log(`Applied ${filename}`);
      }
    } finally {
      await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))', ['alsvid-schema-migrations']);
    }
  } finally {
    lockClient.release();
    await database.close();
  }
}

await migrate();
