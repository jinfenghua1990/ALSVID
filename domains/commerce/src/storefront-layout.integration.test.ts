import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';
import { StorefrontLayoutService } from './storefront-layout.js';

test('shared layout persists and concurrent edits cannot overwrite each other',
  { skip: process.env.ALSVID_LAYOUT_TEST_ISOLATED !== '1' }, async () => {
    const target = new URL(process.env.DATABASE_URL ?? '');
    assert.ok(['127.0.0.1', 'localhost', 'postgres'].includes(target.hostname), 'only isolated PostgreSQL is allowed');
    const isLocalTest = target.pathname === '/alsvid_test' && target.username === 'alsvid_test';
    const isDisposableCi = process.env.GITHUB_ACTIONS === 'true' && process.env.NODE_ENV === 'test'
      && target.hostname === 'localhost' && target.pathname === '/alsvid' && target.username === 'alsvid';
    assert.ok(isLocalTest || isDisposableCi, 'refuse databases outside the isolated test configurations');
    const db = new Database();
    const audit = { record: async () => {} };
    const actor = { userId: randomUUID(), permissions: ['commerce.storefront.read', 'commerce.storefront.write'] };
    const service = new StorefrontLayoutService(db, audit);
    try {
      assert.equal(await service.read(actor), null);
      const first = await service.save(actor, { project: { pages: [{ name: 'homepage' }] }, expectedVersion: 0 });
      assert.equal(first.version, 1);
      assert.deepEqual((await service.read(actor))?.project, first.project);
      const attempts = await Promise.allSettled([
        service.save(actor, { project: { title: 'one' }, expectedVersion: 1 }),
        service.save(actor, { project: { title: 'two' }, expectedVersion: 1 }),
      ]);
      assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
      const failure = attempts.find(result => result.status === 'rejected');
      assert.ok(failure && failure.status === 'rejected');
      assert.equal(failure.reason.code, 'COMMERCE_CONFLICT');
      assert.equal((await service.read(actor))?.version, 2);
      await assert.rejects(service.save(actor, { project: {}, expectedVersion: 0 }), { code: 'COMMERCE_CONFLICT' });
    } finally { await db.close(); }
  });
