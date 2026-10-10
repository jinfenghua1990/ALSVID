import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { assertPermission, Permission, type AuthContext } from '@alsvid/identity';

export const PartnerRoles = ['SUPPLIER', 'FACTORY', 'DEALER', 'CUSTOMER', 'SERVICE_PARTNER', 'LOGISTICS_PROVIDER'] as const;
export type PartnerRole = (typeof PartnerRoles)[number];
export type PartnerKind = 'ORGANIZATION' | 'PERSON';

export interface PartnerIdentifierInput { scheme: string; value: string }
export interface PartnerContactInput { type: 'EMAIL' | 'PHONE' | 'WEBSITE'; purpose: 'GENERAL' | 'SALES' | 'FINANCE' | 'SERVICE' | 'LOGISTICS'; value: string; isPrimary?: boolean }
export interface PartnerAddressInput { purpose: 'REGISTERED' | 'BILLING' | 'SHIPPING' | 'WAREHOUSE' | 'SERVICE'; recipient?: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; countryCode: string }

export interface CreatePartnerInput {
  kind: PartnerKind;
  displayName: string;
  legalName?: string;
  countryCode?: string;
  roles?: PartnerRole[];
  identifiers?: PartnerIdentifierInput[];
  contacts?: PartnerContactInput[];
  addresses?: PartnerAddressInput[];
}

export interface UpdatePartnerInput extends Partial<CreatePartnerInput> {
  status?: 'ACTIVE' | 'INACTIVE';
  expectedVersion: number;
}

export interface PartnerSummary {
  id: string;
  partnerCode: string;
  kind: PartnerKind;
  displayName: string;
  legalName: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  countryCode: string | null;
  version: number;
  roles: PartnerRole[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerDetail extends PartnerSummary {
  identifiers: Array<{ id: string; scheme: string; value: string }>;
  contacts: Array<{ id: string; type: string; purpose: string; value: string; isPrimary: boolean }>;
  addresses: Array<{ id: string; purpose: string; recipient: string | null; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; countryCode: string }>;
}

export class PartnerValidationError extends Error {}
export class PartnerNotFoundError extends Error {}
export class PartnerConflictError extends Error {}

export function normalizeIdentifier(scheme: string, value: string): { scheme: string; rawValue: string; normalizedValue: string } {
  const normalizedScheme = scheme.trim().toUpperCase();
  const rawValue = value.trim();
  if (!normalizedScheme || !rawValue) throw new PartnerValidationError('Identifier scheme and value are required');
  const normalizedValue = normalizedScheme === 'EMAIL' ? rawValue.toLowerCase() : rawValue.toUpperCase().replace(/\s+/g, '');
  return { scheme: normalizedScheme, rawValue, normalizedValue };
}

export function assertUniqueRoles(roles: readonly PartnerRole[]): void {
  if (new Set(roles).size !== roles.length) throw new PartnerValidationError('Partner roles must be unique');
  for (const role of roles) {
    if (!(PartnerRoles as readonly string[]).includes(role)) throw new PartnerValidationError(`Unknown Partner role: ${role}`);
  }
}

function normalizeCountry(value?: string): string | null {
  if (!value) return null;
  const country = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new PartnerValidationError('countryCode must be ISO 3166-1 alpha-2');
  return country;
}

function mapSummary(row: {
  id: string; partner_code: string; kind: PartnerKind; display_name: string; legal_name: string | null; status: 'ACTIVE' | 'INACTIVE'; country_code: string | null; version: number; roles: PartnerRole[]; created_at: Date; updated_at: Date;
}): PartnerSummary {
  return {
    id: row.id,
    partnerCode: row.partner_code,
    kind: row.kind,
    displayName: row.display_name,
    legalName: row.legal_name,
    status: row.status,
    countryCode: row.country_code?.trim() ?? null,
    version: row.version,
    roles: row.roles ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function replaceRoles(executor: QueryExecutor, partnerId: string, actorUserId: string, roles: PartnerRole[]): Promise<void> {
  assertUniqueRoles(roles);
  await executor.query('DELETE FROM partners.roles WHERE partner_id = $1', [partnerId]);
  for (const role of roles) {
    await executor.query('INSERT INTO partners.roles(partner_id, role, created_by) VALUES ($1, $2, $3)', [partnerId, role, actorUserId]);
  }
}

async function replaceIdentifiers(executor: QueryExecutor, partnerId: string, identifiers: PartnerIdentifierInput[]): Promise<void> {
  await executor.query('DELETE FROM partners.identifiers WHERE partner_id = $1', [partnerId]);
  for (const identifier of identifiers) {
    const normalized = normalizeIdentifier(identifier.scheme, identifier.value);
    await executor.query(
      'INSERT INTO partners.identifiers(partner_id, scheme, raw_value, normalized_value) VALUES ($1, $2, $3, $4)',
      [partnerId, normalized.scheme, normalized.rawValue, normalized.normalizedValue],
    );
  }
}

async function replaceContacts(executor: QueryExecutor, partnerId: string, contacts: PartnerContactInput[]): Promise<void> {
  await executor.query('DELETE FROM partners.contacts WHERE partner_id = $1', [partnerId]);
  for (const contact of contacts) {
    if (!contact.value.trim()) throw new PartnerValidationError('Contact value is required');
    await executor.query(
      'INSERT INTO partners.contacts(partner_id, type, purpose, value, is_primary) VALUES ($1, $2, $3, $4, $5)',
      [partnerId, contact.type, contact.purpose, contact.value.trim(), contact.isPrimary ?? false],
    );
  }
}

async function replaceAddresses(executor: QueryExecutor, partnerId: string, addresses: PartnerAddressInput[]): Promise<void> {
  await executor.query('DELETE FROM partners.addresses WHERE partner_id = $1', [partnerId]);
  for (const address of addresses) {
    await executor.query(
      `INSERT INTO partners.addresses(partner_id, purpose, recipient, line1, line2, city, region, postal_code, country_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [partnerId, address.purpose, address.recipient?.trim() || null, address.line1.trim(), address.line2?.trim() || null, address.city.trim(), address.region?.trim() || null, address.postalCode?.trim() || null, normalizeCountry(address.countryCode)],
    );
  }
}

export class PartnerService {
  constructor(private readonly database: Database, private readonly audit: AuditService) {}

  async list(actor: AuthContext, query = ''): Promise<PartnerSummary[]> {
    assertPermission(actor, Permission.PartnerRead);
    const search = query.trim().toLowerCase();
    const result = await this.database.query<any>(
      `SELECT p.id, p.partner_code, p.kind, p.display_name, p.legal_name, p.status, p.country_code, p.version, p.created_at, p.updated_at,
              COALESCE(array_agg(r.role ORDER BY r.role) FILTER (WHERE r.role IS NOT NULL AND r.enabled), ARRAY[]::text[]) AS roles
       FROM partners.partners p LEFT JOIN partners.roles r ON r.partner_id = p.id
       WHERE $1 = '' OR lower(p.display_name) LIKE '%' || $1 || '%' OR lower(COALESCE(p.legal_name,'')) LIKE '%' || $1 || '%' OR lower(p.partner_code) LIKE '%' || $1 || '%'
       GROUP BY p.id ORDER BY lower(p.display_name) LIMIT 200`,
      [search],
    );
    return result.rows.map(mapSummary);
  }

  async get(actor: AuthContext, partnerId: string): Promise<PartnerDetail> {
    assertPermission(actor, Permission.PartnerRead);
    const base = await this.database.query<any>(
      `SELECT p.id, p.partner_code, p.kind, p.display_name, p.legal_name, p.status, p.country_code, p.version, p.created_at, p.updated_at,
              COALESCE(array_agg(r.role ORDER BY r.role) FILTER (WHERE r.role IS NOT NULL AND r.enabled), ARRAY[]::text[]) AS roles
       FROM partners.partners p LEFT JOIN partners.roles r ON r.partner_id = p.id
       WHERE p.id = $1 GROUP BY p.id`,
      [partnerId],
    );
    if (!base.rows[0]) throw new PartnerNotFoundError('Partner not found');

    const [identifiers, contacts, addresses] = await Promise.all([
      this.database.query<any>('SELECT id, scheme, raw_value FROM partners.identifiers WHERE partner_id = $1 ORDER BY scheme, raw_value', [partnerId]),
      this.database.query<any>('SELECT id, type, purpose, value, is_primary FROM partners.contacts WHERE partner_id = $1 ORDER BY is_primary DESC, purpose, type', [partnerId]),
      this.database.query<any>('SELECT id, purpose, recipient, line1, line2, city, region, postal_code, country_code FROM partners.addresses WHERE partner_id = $1 ORDER BY purpose, city', [partnerId]),
    ]);

    return {
      ...mapSummary(base.rows[0]),
      identifiers: identifiers.rows.map((row) => ({ id: row.id, scheme: row.scheme, value: row.raw_value })),
      contacts: contacts.rows.map((row) => ({ id: row.id, type: row.type, purpose: row.purpose, value: row.value, isPrimary: row.is_primary })),
      addresses: addresses.rows.map((row) => ({ id: row.id, purpose: row.purpose, recipient: row.recipient, line1: row.line1, line2: row.line2, city: row.city, region: row.region, postalCode: row.postal_code, countryCode: row.country_code.trim() })),
    };
  }

  async create(actor: AuthContext, input: CreatePartnerInput): Promise<PartnerDetail> {
    assertPermission(actor, Permission.PartnerWrite);
    if (input.roles?.length) assertPermission(actor, Permission.PartnerRoleManage);
    const displayName = input.displayName.trim();
    if (displayName.length < 2) throw new PartnerValidationError('displayName is required');
    if (!['ORGANIZATION', 'PERSON'].includes(input.kind)) throw new PartnerValidationError('Invalid Partner kind');

    try {
      const id = await this.database.transaction(async (client) => {
        const created = await client.query<{ id: string }>(
          `INSERT INTO partners.partners(kind, display_name, legal_name, country_code, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
          [input.kind, displayName, input.legalName?.trim() || null, normalizeCountry(input.countryCode ?? undefined), actor.userId],
        );
        const partnerId = created.rows[0]!.id;
        if (input.roles) await replaceRoles(client, partnerId, actor.userId, input.roles);
        if (input.identifiers) await replaceIdentifiers(client, partnerId, input.identifiers);
        if (input.contacts) await replaceContacts(client, partnerId, input.contacts);
        if (input.addresses) await replaceAddresses(client, partnerId, input.addresses);
        await this.audit.record({ actorUserId: actor.userId, action: 'partner.created', targetType: 'partner', targetId: partnerId, metadata: { roles: input.roles ?? [] } }, client);
        return partnerId;
      });
      return this.get(actor, id);
    } catch (error: any) {
      if (error?.code === '23505') throw new PartnerConflictError('A Partner identifier is already in use');
      throw error;
    }
  }

  async update(actor: AuthContext, partnerId: string, input: UpdatePartnerInput): Promise<PartnerDetail> {
    assertPermission(actor, Permission.PartnerWrite);
    if (input.roles) assertPermission(actor, Permission.PartnerRoleManage);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) throw new PartnerValidationError('expectedVersion is required');

    try {
      await this.database.transaction(async (client) => {
        const updated = await client.query<{ id: string }>(
          `UPDATE partners.partners
           SET kind = COALESCE($3, kind),
               display_name = COALESCE($4, display_name),
               legal_name = CASE WHEN $5::boolean THEN $6 ELSE legal_name END,
               country_code = CASE WHEN $7::boolean THEN $8 ELSE country_code END,
               status = COALESCE($9, status), version = version + 1, updated_by = $10, updated_at = now()
           WHERE id = $1 AND version = $2 RETURNING id`,
          [partnerId, input.expectedVersion, input.kind ?? null, input.displayName?.trim() || null, input.legalName !== undefined, input.legalName?.trim() || null, input.countryCode !== undefined, normalizeCountry(input.countryCode ?? undefined), input.status ?? null, actor.userId],
        );
        if (!updated.rows[0]) {
          const exists = await client.query('SELECT 1 FROM partners.partners WHERE id = $1', [partnerId]);
          if (!exists.rows[0]) throw new PartnerNotFoundError('Partner not found');
          throw new PartnerConflictError('Partner changed since it was loaded; refresh and retry');
        }
        if (input.roles) await replaceRoles(client, partnerId, actor.userId, input.roles);
        if (input.identifiers) await replaceIdentifiers(client, partnerId, input.identifiers);
        if (input.contacts) await replaceContacts(client, partnerId, input.contacts);
        if (input.addresses) await replaceAddresses(client, partnerId, input.addresses);
        await this.audit.record({ actorUserId: actor.userId, action: 'partner.updated', targetType: 'partner', targetId: partnerId, metadata: { fields: Object.keys(input).filter((key) => key !== 'expectedVersion') } }, client);
      });
      return this.get(actor, partnerId);
    } catch (error: any) {
      if (error?.code === '23505') throw new PartnerConflictError('A Partner identifier is already in use');
      throw error;
    }
  }
}
