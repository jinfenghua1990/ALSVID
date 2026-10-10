import type { Clock } from '@alsvid/kernel';
import { systemClock } from '@alsvid/kernel';
import { assertPermission } from '../core/permissions.js';
import { InvalidCredentialsError, IdentityValidationError } from '../core/errors.js';
import { Permission, type AuthContext } from '../core/auth.js';
import type { IdentityAuditPort, IdentityRepository, PasswordHasher, SessionTokenService } from './ports.js';

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly audit: IdentityAuditPort,
    private readonly passwords: PasswordHasher,
    private readonly tokens: SessionTokenService,
    private readonly clock: Clock = systemClock,
  ) {}

  async bootstrapAdmin(email: string, password: string, displayName = 'ALSVID Administrator'): Promise<string> {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await this.passwords.hash(password);
    return this.repository.transaction(async (executor) => {
      let userId = await this.repository.findUserIdByEmail(normalizedEmail, executor);
      if (userId) await this.repository.updateBootstrapUser(userId, displayName.trim(), passwordHash, executor);
      else userId = await this.repository.createUser(normalizedEmail, displayName.trim(), passwordHash, executor);
      await this.repository.ensureUserRole(userId, 'system_admin', executor);
      await this.audit.record({ action: 'identity.bootstrap_admin', targetType: 'user', targetId: userId }, executor);
      return userId;
    });
  }

  async login(email: string, password: string): Promise<{ token: string; expiresAt: string; user: AuthContext }> {
    const row = await this.repository.findLoginContext(normalizeEmail(email));
    if (!row || !(await this.passwords.verify(password, row.passwordHash))) throw new InvalidCredentialsError();
    const token = this.tokens.create();
    const expiresAt = new Date(this.clock.now().getTime() + 12 * 60 * 60 * 1000);
    await this.repository.transaction(async (executor) => {
      await this.repository.createSession(row.userId, this.tokens.hash(token), expiresAt, executor);
      await this.audit.record({ actorUserId: row.userId, action: 'identity.login', targetType: 'session' }, executor);
    });
    const { passwordHash: _passwordHash, ...user } = row;
    return { token, expiresAt: expiresAt.toISOString(), user };
  }

  async authenticate(token: string): Promise<AuthContext> {
    const tokenHash = this.tokens.hash(token);
    const row = await this.repository.findAuthenticatedContext(tokenHash);
    if (!row) throw new InvalidCredentialsError();
    await this.repository.touchSession(tokenHash);
    return row;
  }

  logout(token: string): Promise<void> { return this.repository.revokeSession(this.tokens.hash(token)); }

  async listUsers(actor: AuthContext): Promise<Array<AuthContext & { status: string }>> {
    assertPermission(actor, Permission.IdentityUserRead);
    return this.repository.listUsers();
  }

  async setUserRoles(actor: AuthContext, userId: string, roles: string[]): Promise<void> {
    assertPermission(actor, Permission.IdentityRoleManage);
    const distinctRoles = [...new Set(roles)];
    if (actor.userId === userId && actor.roles.includes('system_admin') && !distinctRoles.includes('system_admin')) throw new IdentityValidationError('A system administrator cannot remove their own system_admin role');
    await this.repository.transaction(async (executor) => {
      if (await this.repository.countKnownRoles(distinctRoles, executor) !== distinctRoles.length) throw new IdentityValidationError('Unknown role');
      await this.repository.replaceUserRoles(userId, distinctRoles, executor);
      await this.audit.record({ actorUserId: actor.userId, action: 'identity.roles_changed', targetType: 'user', targetId: userId, metadata: { roles: distinctRoles } }, executor);
    });
  }
}

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!value) throw new IdentityValidationError('Email is required');
  return value;
}
