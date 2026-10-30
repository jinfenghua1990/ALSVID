import type { DatabasePort } from '@alsvid/database';
import { ForbiddenError } from '@alsvid/kernel';
import type { CommerceAuditPort } from './application/ports.js';
import { CommerceConflictError, CommerceValidationError } from './core/errors.js';
import type { StorefrontActor } from './storefront-orders.js';

type DraftRow = { project: Record<string, unknown>; version: number; updated_at: Date };

export class StorefrontLayoutService {
  constructor(private readonly db: DatabasePort, private readonly audit: CommerceAuditPort) {}

  async read(actor: StorefrontActor) {
    this.requirePermission(actor, 'commerce.storefront.read');
    const result = await this.db.query<DraftRow>(
      "SELECT project, version, updated_at FROM commerce.storefront_layout_drafts WHERE page_key = 'homepage'",
    );
    const row = result.rows[0];
    return row ? { project: row.project, version: row.version, updatedAt: row.updated_at.toISOString() } : null;
  }

  async save(actor: StorefrontActor, input: { project: unknown; expectedVersion: unknown }) {
    this.requirePermission(actor, 'commerce.storefront.write');
    if (!input || !input.project || typeof input.project !== 'object' || Array.isArray(input.project))
      throw new CommerceValidationError('Project must be a JSON object');
    if (!Number.isInteger(input.expectedVersion) || (input.expectedVersion as number) < 0)
      throw new CommerceValidationError('Expected version must be a non-negative integer');
    const serialized = JSON.stringify(input.project);
    if (Buffer.byteLength(serialized, 'utf8') > 2 * 1024 * 1024)
      throw new CommerceValidationError('Project exceeds the 2 MB limit');
    const expected = input.expectedVersion as number;
    return this.db.transaction(async executor => {
      const result = expected === 0
        ? await executor.query<DraftRow>(
          "INSERT INTO commerce.storefront_layout_drafts (page_key, project, updated_by) VALUES ('homepage', $1::jsonb, $2) ON CONFLICT DO NOTHING RETURNING project, version, updated_at",
          [serialized, actor.userId],
        )
        : await executor.query<DraftRow>(
          "UPDATE commerce.storefront_layout_drafts SET project = $1::jsonb, updated_by = $2, updated_at = now(), version = version + 1 WHERE page_key = 'homepage' AND version = $3 RETURNING project, version, updated_at",
          [serialized, actor.userId, expected],
        );
      const row = result.rows[0];
      if (!row) throw new CommerceConflictError('Draft changed since it was loaded; reload before saving');
      await this.audit.record({ actorUserId: actor.userId, action: 'commerce.storefront_layout_saved', targetType: 'commerce.storefront_layout', targetId: 'homepage', metadata: { version: row.version } }, executor);
      return { project: row.project, version: row.version, updatedAt: row.updated_at.toISOString() };
    });
  }

  private requirePermission(actor: StorefrontActor, permission: string) {
    if (!actor.permissions.includes(permission)) throw new ForbiddenError('COMMERCE_FORBIDDEN', `Missing ${permission}`);
  }
}
