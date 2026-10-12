import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Database } from './index.js';

function harness() {
  const database = new Database('postgresql://unused:unused@localhost/unused');
  const client = new EventEmitter();
  const statements: string[] = [];
  const releases: boolean[] = [];
  let failRollback = false;
  Object.assign(client, {
    async query(sql: string) {
      statements.push(sql);
      if (sql === 'ROLLBACK' && failRollback) throw new Error('Connection closed');
      return { rows: [], rowCount: 0 };
    },
    release(discard: boolean) { releases.push(discard); },
  });
  Object.defineProperty(database.pool, 'connect', { value: async () => client });
  return { database, client, statements, releases, breakRollback: () => { failRollback = true; } };
}

test('repeated transactions do not accumulate client error listeners', async () => {
  const h = harness();
  const existingListener = () => {};
  h.client.on('error', existingListener);
  try {
    for (let i = 0; i < 30; i++) {
      assert.equal(await h.database.transaction(async () => i), i);
      assert.deepEqual(h.client.listeners('error'), [existingListener]);
    }
    assert.equal(h.statements.filter((sql) => sql === 'COMMIT').length, 30);
    assert.ok(h.releases.every((discard) => !discard));
  } finally { await h.database.close(); }
});

test('successful rollback preserves the original error and allows client reuse', async () => {
  const h = harness();
  const original = new Error('Business operation failed');
  try {
    await assert.rejects(h.database.transaction(async () => { throw original; }), (error) => error === original);
    assert.deepEqual(h.statements, ['BEGIN', 'ROLLBACK']);
    assert.deepEqual(h.releases, [false]);
    assert.equal(h.client.listenerCount('error'), 0);
  } finally { await h.database.close(); }
});

test('failed rollback discards the connection without masking the original error', async () => {
  const h = harness();
  h.breakRollback();
  const original = new Error('Original failure');
  try {
    await assert.rejects(h.database.transaction(async () => { throw original; }), (error) => error === original);
    assert.deepEqual(h.releases, [true]);
    assert.equal(h.client.listenerCount('error'), 0);
  } finally { await h.database.close(); }
});

test('a client error during a transaction causes disposal and listener cleanup', async () => {
  const h = harness();
  const original = new Error('Connection lost');
  try {
    await assert.rejects(h.database.transaction(async () => {
      h.client.emit('error', original);
      throw original;
    }), (error) => error === original);
    assert.deepEqual(h.releases, [true]);
    assert.equal(h.client.listenerCount('error'), 0);
  } finally { await h.database.close(); }
});
