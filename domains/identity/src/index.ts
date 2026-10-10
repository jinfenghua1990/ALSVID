import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';

export const Permission = {
  IdentityUserRead: 'identity.user.read',
  IdentityRoleManage: 'identity.role.manage',
  AuditRead: 'audit.read',
  PartnerRead: 'partner.read',
  PartnerWrite: 'partner.write',
  PartnerRoleManage: 'partner.role.manage',
} as const;

export type PermissionId = (typeof Permission)[keyof typeof Permission];

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
}

export class PermissionDeniedError extends Error {
  constructor(permission: string) {
    super(`Missing permission: ${permission}`);
    this.name = 'PermissionDeniedError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export function assertPermission(context: AuthContext, permission: PermissionId): void {
  if (!context.permissions.includes(permission)) {
    throw new PermissionDeniedError(permission);
  }
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) throw new Error('Password must be at least 12 characters');
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt);
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltText, hashText] = encoded.split('$');
  if (algorithm !== 'scrypt' || n !== '16384' || r !== '8' || p !== '1' || !saltText || !hashText) return false;
  const derived = await scryptAsync(password, Buffer.from(saltText, 'base64url'));
  const expected = Buffer.from(hashText, 'base64url');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface AuthRow {
  id: string;
  email: string;
  display_name: string;
  password_hash?: string;
  roles: string[];
  permissions: string[];
}

function toContext(row: AuthRow): AuthContext {
  return {
    userId: row.id,
    email: row.email,
    displayName: row.display_name,
    roles: row.roles ?? [],
    permissions: row.permissions ?? [],
  };
}

export class IdentityService {
  constructor(
    private readonly database: Database,
    private readonly audit: AuditService,
  ) {}

  async bootstrapAdmin(email: string, password: string, displayName = 'ALSVID Administrator'): Promise<string> {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashPassword(password);

    return this.database.transaction(async (client) => {
      const existing = await client.query<{ id: string }>('SELECT id FROM identity.users WHERE email = $1', [normalizedEmail]);
      let userId = existing.rows[0]?.id;

      if (userId) {
        await client.query(
          `UPDATE identity.users SET display_name = $2, password_hash = $3, status = 'ACTIVE', updated_at = now()
           WHERE id = $1`,
          [userId, displayName.trim(), passwordHash],
        );
      } else {
        const created = await client.query<{ id: string }>(
          `INSERT INTO identity.users(email, display_name, password_hash)
           VALUES ($1, $2, $3) RETURNING id`,
          [normalizedEmail, displayName.trim(), passwordHash],
        );
        userId = created.rows[0]!.id;
      }

      await client.query(
        `INSERT INTO identity.user_roles(user_id, role_id) VALUES ($1, 'system_admin')
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId],
      );
      await this.audit.record({ action: 'identity.bootstrap_admin', targetType: 'user', targetId: userId }, client);
      return userId;
    });
  }

  async login(email: string, password: string): Promise<{ token: string; expiresAt: string; user: AuthContext }> {
    const result = await this.database.query<AuthRow>(
      `SELECT u.id, u.email, u.display_name, u.password_hash,
              COALESCE(array_agg(DISTINCT ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::text[]) AS roles,
              COALESCE(array_agg(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), ARRAY[]::text[]) AS permissions
       FROM identity.users u
       LEFT JOIN identity.user_roles ur ON ur.user_id = u.id
       LEFT JOIN identity.role_permissions rp ON rp.role_id = ur.role_id
       WHERE u.email = $1 AND u.status = 'ACTIVE'
       GROUP BY u.id`,
      [normalizeEmail(email)],
    );

    const row = result.rows[0];
    if (!row?.password_hash || !(await verifyPassword(password, row.password_hash))) throw new InvalidCredentialsError();

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    await this.database.query(
      `INSERT INTO identity.sessions(user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [row.id, hashSessionToken(token), expiresAt],
    );
    await this.audit.record({ actorUserId: row.id, action: 'identity.login', targetType: 'session' });

    return { token, expiresAt: expiresAt.toISOString(), user: toContext(row) };
  }

  async authenticate(token: string): Promise<AuthContext> {
    const result = await this.database.query<AuthRow>(
      `SELECT u.id, u.email, u.display_name,
              COALESCE(array_agg(DISTINCT ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::text[]) AS roles,
              COALESCE(array_agg(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), ARRAY[]::text[]) AS permissions
       FROM identity.sessions s
       JOIN identity.users u ON u.id = s.user_id
       LEFT JOIN identity.user_roles ur ON ur.user_id = u.id
       LEFT JOIN identity.role_permissions rp ON rp.role_id = ur.role_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'
       GROUP BY u.id`,
      [hashSessionToken(token)],
    );

    const row = result.rows[0];
    if (!row) throw new InvalidCredentialsError();
    await this.database.query('UPDATE identity.sessions SET last_seen_at = now() WHERE token_hash = $1', [hashSessionToken(token)]);
    return toContext(row);
  }

  async logout(token: string): Promise<void> {
    await this.database.query('UPDATE identity.sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
      hashSessionToken(token),
    ]);
  }

  async listUsers(actor: AuthContext): Promise<Array<AuthContext & { status: string }>> {
    assertPermission(actor, Permission.IdentityUserRead);
    const result = await this.database.query<{
      id: string;
      email: string;
      display_name: string;
      status: string;
      roles: string[];
      permissions: string[];
    }>(
      `SELECT u.id, u.email, u.display_name, u.status,
              COALESCE(array_agg(DISTINCT ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), ARRAY[]::text[]) AS roles,
              COALESCE(array_agg(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), ARRAY[]::text[]) AS permissions
       FROM identity.users u
       LEFT JOIN identity.user_roles ur ON ur.user_id = u.id
       LEFT JOIN identity.role_permissions rp ON rp.role_id = ur.role_id
       GROUP BY u.id ORDER BY lower(u.display_name), u.email`,
    );
    return result.rows.map((row) => ({ ...toContext(row), status: row.status }));
  }

  async setUserRoles(actor: AuthContext, userId: string, roles: string[]): Promise<void> {
    assertPermission(actor, Permission.IdentityRoleManage);
    const distinctRoles = [...new Set(roles)];
    if (actor.userId === userId && actor.roles.includes('system_admin') && !distinctRoles.includes('system_admin')) {
      throw new Error('A system administrator cannot remove their own system_admin role');
    }

    await this.database.transaction(async (client) => {
      const valid = await client.query<{ id: string }>('SELECT id FROM identity.roles WHERE id = ANY($1::text[])', [distinctRoles]);
      if (valid.rows.length !== distinctRoles.length) throw new Error('Unknown role');
      await client.query('DELETE FROM identity.user_roles WHERE user_id = $1', [userId]);
      for (const role of distinctRoles) {
        await client.query('INSERT INTO identity.user_roles(user_id, role_id) VALUES ($1, $2)', [userId, role]);
      }
      await this.audit.record(
        { actorUserId: actor.userId, action: 'identity.roles_changed', targetType: 'user', targetId: userId, metadata: { roles: distinctRoles } },
        client,
      );
    });
  }
}
