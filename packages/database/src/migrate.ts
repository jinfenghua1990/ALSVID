import { readdir, readFile } from 'node:fs/promises';
import { Database } from './index.js';

const database = new Database();
const migrationsUrl = new URL('../migrations/', import.meta.url);

async function migrate(): Promise<void> {
  await database.query('SELECT pg_advisory_lock(hashtext($1))', ['alsvid-schema-migrations']);

  try {
    await database.query('CREATE SCHEMA IF NOT EXISTS platform');
    await database.query(`
      CREATE TABLE IF NOT EXISTS platform.schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsUrl)).filter((file) => file.endsWith('.sql')).sort();
    const applied = await database.query<{ filename: string }>('SELECT filename FROM platform.schema_migrations');
    const appliedSet = new Set(applied.rows.map((row) => row.filename));

    for (const filename of files) {
      if (appliedSet.has(filename)) continue;

      const sql = await readFile(new URL(filename, migrationsUrl), 'utf8');
      await database.transaction(async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO platform.schema_migrations(filename) VALUES ($1)', [filename]);
      });
      console.log(`Applied ${filename}`);
    }
  } finally {
    await database.query('SELECT pg_advisory_unlock(hashtext($1))', ['alsvid-schema-migrations']);
    await database.close();
  }
}

await migrate();
