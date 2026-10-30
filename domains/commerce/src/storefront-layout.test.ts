import assert from 'node:assert/strict';
import test from 'node:test';
import type { DatabasePort } from '@alsvid/database';
import type { CommerceAuditPort } from './application/ports.js';
import { StorefrontLayoutService } from './storefront-layout.js';

test('layout drafts require permissions and reject invalid or oversized input', async () => {
  const service = new StorefrontLayoutService({} as DatabasePort, {} as CommerceAuditPort);
  const none = { userId: 'u', permissions: [] };
  const writer = { userId: 'u', permissions: ['commerce.storefront.write'] };
  await assert.rejects(service.read(none), { code: 'COMMERCE_FORBIDDEN' });
  await assert.rejects(service.save(none, { project: {}, expectedVersion: 0 }), { code: 'COMMERCE_FORBIDDEN' });
  await assert.rejects(service.save(writer, { project: [], expectedVersion: 0 }), { code: 'COMMERCE_VALIDATION' });
  await assert.rejects(service.save(writer, { project: {}, expectedVersion: -1 }), { code: 'COMMERCE_VALIDATION' });
  await assert.rejects(service.save(writer, { project: { content: 'x'.repeat(2 * 1024 * 1024) }, expectedVersion: 0 }), { code: 'COMMERCE_VALIDATION' });
});

test('stale draft updates fail and do not emit an audit event', async () => {
  let audited = false;
  const db = { transaction: async (work: (executor: unknown) => Promise<unknown>) => work({ query: async () => ({ rows: [] }) }) } as unknown as DatabasePort;
  const audit = { record: async () => { audited = true; } } as CommerceAuditPort;
  const service = new StorefrontLayoutService(db, audit);
  await assert.rejects(service.save({ userId: 'u', permissions: ['commerce.storefront.write'] }, { project: {}, expectedVersion: 1 }), { code: 'COMMERCE_CONFLICT' });
  assert.equal(audited, false);
});
