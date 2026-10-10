import type { AuditService } from '@alsvid/audit';
import type { Database } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';
import { normalizeProductCode } from '@alsvid/product';

export const EngineeringCapability = {
  Read: 'engineering.read',
  Write: 'engineering.write',
  Release: 'engineering.release',
} as const;

export class EngineeringValidationError extends Error {}
export class EngineeringNotFoundError extends Error {}
export class EngineeringConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

export function assertPositiveQuantity(value: number): void {
  if (!Number.isFinite(value) || value <= 0) throw new EngineeringValidationError('quantity must be greater than zero');
}

export class EngineeringService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async summary(actor: AuthContext): Promise<{ parts: any[]; boms: any[]; buildSpecs: any[] }> {
    requireCapability(actor, EngineeringCapability.Read);
    const [parts, boms, buildSpecs] = await Promise.all([
      this.database.query<any>('SELECT id, part_number, name, category, default_unit, status, version FROM engineering.parts ORDER BY part_number LIMIT 500'),
      this.database.query<any>(`SELECT b.id, b.code, b.name, b.model_id, m.code AS model_code, r.id AS revision_id, r.revision_code, r.status AS revision_status, r.version AS revision_version, r.released_at,
        (SELECT count(*)::int FROM engineering.bom_lines l WHERE l.revision_id = r.id) AS line_count
        FROM engineering.boms b JOIN product.models m ON m.id = b.model_id
        LEFT JOIN engineering.bom_revisions r ON r.bom_id = b.id
        ORDER BY b.code, r.created_at DESC`),
      this.database.query<any>(`SELECT s.id, s.code, s.status, s.version, s.sku_id, p.sku, s.bom_revision_id, r.revision_code, b.code AS bom_code, s.released_at
        FROM engineering.build_specs s JOIN product.skus p ON p.id = s.sku_id
        JOIN engineering.bom_revisions r ON r.id = s.bom_revision_id JOIN engineering.boms b ON b.id = r.bom_id
        ORDER BY s.code`),
    ]);
    return { parts: parts.rows, boms: boms.rows, buildSpecs: buildSpecs.rows };
  }

  async createPart(actor: AuthContext, input: { partNumber: string; name: string; category?: string; defaultUnit?: string; description?: string }): Promise<any> {
    requireCapability(actor, EngineeringCapability.Write);
    const partNumber = normalizeProductCode(input.partNumber);
    if (!input.name?.trim()) throw new EngineeringValidationError('Part name is required');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO engineering.parts(part_number, name, category, default_unit, description, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
        [partNumber, input.name.trim(), input.category?.trim().toUpperCase() || 'GENERAL', input.defaultUnit?.trim().toUpperCase() || 'EA', input.description?.trim() ?? '', actor.userId],
      );
      await this.audit.record({ actorUserId: actor.userId, action: 'engineering.part_created', targetType: 'engineering.part', targetId: result.rows[0].id, metadata: { partNumber } });
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new EngineeringConflictError('Part number already exists');
      throw error;
    }
  }

  async createBom(actor: AuthContext, input: { modelId: string; code: string; name: string; revisionCode?: string; description?: string }): Promise<{ bom: any; revision: any }> {
    requireCapability(actor, EngineeringCapability.Write);
    const code = normalizeProductCode(input.code);
    const revisionCode = normalizeProductCode(input.revisionCode ?? 'A');
    if (!input.name?.trim()) throw new EngineeringValidationError('BOM name is required');
    try {
      return await this.database.transaction(async (client) => {
        const bom = await client.query<any>(
          `INSERT INTO engineering.boms(model_id, code, name, description, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [input.modelId, code, input.name.trim(), input.description?.trim() ?? '', actor.userId],
        );
        const revision = await client.query<any>(
          `INSERT INTO engineering.bom_revisions(bom_id, revision_code, created_by) VALUES ($1,$2,$3) RETURNING *`,
          [bom.rows[0].id, revisionCode, actor.userId],
        );
        await this.audit.record({ actorUserId: actor.userId, action: 'engineering.bom_created', targetType: 'engineering.bom', targetId: bom.rows[0].id, metadata: { code, revisionCode } }, client);
        return { bom: bom.rows[0], revision: revision.rows[0] };
      });
    } catch (error: any) {
      if (error?.code === '23505') throw new EngineeringConflictError('BOM code or revision already exists');
      if (error?.code === '23503') throw new EngineeringNotFoundError('Model not found');
      throw error;
    }
  }

  async addBomLine(actor: AuthContext, revisionId: string, input: { lineNo: number; partId: string; quantity: number; unit?: string; reference?: string }): Promise<any> {
    requireCapability(actor, EngineeringCapability.Write);
    assertPositiveQuantity(input.quantity);
    if (!Number.isInteger(input.lineNo) || input.lineNo < 1) throw new EngineeringValidationError('lineNo must be a positive integer');
    try {
      const result = await this.database.query<any>(
        `INSERT INTO engineering.bom_lines(revision_id, line_no, part_id, quantity, unit, reference)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [revisionId, input.lineNo, input.partId, input.quantity, input.unit?.trim().toUpperCase() || 'EA', input.reference?.trim() || null],
      );
      await this.audit.record({ actorUserId: actor.userId, action: 'engineering.bom_line_added', targetType: 'engineering.bom_revision', targetId: revisionId, metadata: { lineNo: input.lineNo } });
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new EngineeringConflictError('BOM line number already exists');
      if (error?.code === '23503') throw new EngineeringNotFoundError('BOM revision or Part not found');
      if (String(error?.message).includes('immutable')) throw new EngineeringConflictError('Released BOM revisions are immutable');
      throw error;
    }
  }

  async releaseBomRevision(actor: AuthContext, revisionId: string): Promise<any> {
    requireCapability(actor, EngineeringCapability.Release);
    const result = await this.database.query<any>(
      `UPDATE engineering.bom_revisions SET status = 'RELEASED', released_at = now(), released_by = $2, version = version + 1, updated_at = now()
       WHERE id = $1 AND status = 'DRAFT' RETURNING *`,
      [revisionId, actor.userId],
    );
    if (!result.rows[0]) throw new EngineeringConflictError('BOM revision is missing or already released');
    await this.audit.record({ actorUserId: actor.userId, action: 'engineering.bom_revision_released', targetType: 'engineering.bom_revision', targetId: revisionId });
    return result.rows[0];
  }

  async createBuildSpec(actor: AuthContext, input: { code: string; skuId: string; bomRevisionId: string; notes?: string; attributes?: Record<string, unknown> }): Promise<any> {
    requireCapability(actor, EngineeringCapability.Write);
    const code = normalizeProductCode(input.code);
    try {
      const result = await this.database.query<any>(
        `INSERT INTO engineering.build_specs(code, sku_id, bom_revision_id, notes, attributes, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$6) RETURNING *`,
        [code, input.skuId, input.bomRevisionId, input.notes?.trim() ?? '', JSON.stringify(input.attributes ?? {}), actor.userId],
      );
      await this.audit.record({ actorUserId: actor.userId, action: 'engineering.build_spec_created', targetType: 'engineering.build_spec', targetId: result.rows[0].id, metadata: { code } });
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new EngineeringConflictError('Build Specification code already exists');
      if (error?.code === '23503') throw new EngineeringNotFoundError('SKU or BOM revision not found');
      throw error;
    }
  }

  async releaseBuildSpec(actor: AuthContext, specId: string): Promise<any> {
    requireCapability(actor, EngineeringCapability.Release);
    try {
      const result = await this.database.query<any>(
        `UPDATE engineering.build_specs SET status = 'RELEASED', released_at = now(), released_by = $2, updated_by = $2, version = version + 1, updated_at = now()
         WHERE id = $1 AND status = 'DRAFT' RETURNING *`,
        [specId, actor.userId],
      );
      if (!result.rows[0]) throw new EngineeringConflictError('Build Specification is missing or already released');
      await this.audit.record({ actorUserId: actor.userId, action: 'engineering.build_spec_released', targetType: 'engineering.build_spec', targetId: specId });
      return result.rows[0];
    } catch (error: any) {
      if (String(error?.message).includes('released BOM revision')) throw new EngineeringConflictError('Build Specification requires a released BOM revision');
      throw error;
    }
  }
}
