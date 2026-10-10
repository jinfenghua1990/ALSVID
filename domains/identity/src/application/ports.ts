import type { QueryExecutor } from '@alsvid/database';
import type { AuthContext } from '../core/auth.js';

export interface IdentityAuditPort {
  record(input: { actorUserId?: string | null; action: string; targetType: string; targetId?: string | null; metadata?: Record<string, unknown> }, executor?: QueryExecutor): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encoded: string): Promise<boolean>;
}

export interface SessionTokenService {
  create(): string;
  hash(token: string): string;
}

export interface IdentityRepository {
  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T>;
  findUserIdByEmail(email: string, executor?: QueryExecutor): Promise<string | null>;
  createUser(email: string, displayName: string, passwordHash: string, executor?: QueryExecutor): Promise<string>;
  updateBootstrapUser(userId: string, displayName: string, passwordHash: string, executor?: QueryExecutor): Promise<void>;
  ensureUserRole(userId: string, roleId: string, executor?: QueryExecutor): Promise<void>;
  findLoginContext(email: string): Promise<(AuthContext & { passwordHash: string }) | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date, executor?: QueryExecutor): Promise<void>;
  findAuthenticatedContext(tokenHash: string): Promise<AuthContext | null>;
  touchSession(tokenHash: string): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  listUsers(): Promise<Array<AuthContext & { status: string }>>;
  countKnownRoles(roles: readonly string[], executor?: QueryExecutor): Promise<number>;
  replaceUserRoles(userId: string, roles: readonly string[], executor?: QueryExecutor): Promise<void>;
}
