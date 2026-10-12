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

export interface OneTimeCodeService {
  create(): string;
  hash(code: string): Promise<string>;
  verify(code: string, encoded: string): Promise<boolean>;
}

export interface IdentityVerificationDelivery {
  readonly configured: boolean;
  sendCode(input: { email: string; code: string; expiresAt: Date }): Promise<void>;
}

export type InternalRegistrationMode = 'company_domain' | 'invite_only';

export interface IdentityRegistrationPolicy {
  approvedEmailDomains: readonly string[];
  registrationMode: InternalRegistrationMode;
  initialAdminEmail: string | null;
  verificationTtlMs: number;
  resendCooldownMs: number;
  maxVerificationAttempts: number;
  exposeTestCode: boolean;
}

export interface EmailVerificationChallenge {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface IdentityRepository {
  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T>;
  findUserIdByEmail(email: string, executor?: QueryExecutor): Promise<string | null>;
  createUser(email: string, displayName: string, passwordHash: string | null, emailVerifiedAt: Date | null, executor?: QueryExecutor): Promise<string>;
  updateBootstrapUser(userId: string, displayName: string, passwordHash: string, executor?: QueryExecutor): Promise<void>;
  ensureUserRole(userId: string, roleId: string, executor?: QueryExecutor): Promise<void>;
  findLoginContext(email: string): Promise<(AuthContext & { passwordHash: string | null }) | null>;
  findUserContextById(userId: string, executor?: QueryExecutor): Promise<AuthContext | null>;
  markEmailVerified(userId: string, verifiedAt: Date, executor?: QueryExecutor): Promise<void>;
  setPasswordHash(userId: string, passwordHash: string, executor?: QueryExecutor): Promise<void>;
  hasActiveSystemAdmin(executor?: QueryExecutor): Promise<boolean>;
  createSession(userId: string, tokenHash: string, expiresAt: Date, executor?: QueryExecutor): Promise<void>;
  findAuthenticatedContext(tokenHash: string): Promise<AuthContext | null>;
  touchSession(tokenHash: string): Promise<void>;
  revokeSession(tokenHash: string): Promise<void>;
  listUsers(): Promise<Array<AuthContext & { status: string }>>;
  countKnownRoles(roles: readonly string[], executor?: QueryExecutor): Promise<number>;
  replaceUserRoles(userId: string, roles: readonly string[], executor?: QueryExecutor): Promise<void>;
  findLatestEmailChallenge(email: string, executor?: QueryExecutor): Promise<EmailVerificationChallenge | null>;
  findEmailChallengeForUpdate(email: string, executor: QueryExecutor): Promise<EmailVerificationChallenge | null>;
  invalidateActiveEmailChallenges(email: string, executor?: QueryExecutor): Promise<void>;
  createEmailChallenge(email: string, codeHash: string, expiresAt: Date, maxAttempts: number, executor?: QueryExecutor): Promise<string>;
  incrementEmailChallengeAttempts(challengeId: string, executor?: QueryExecutor): Promise<void>;
  consumeEmailChallenge(challengeId: string, executor?: QueryExecutor): Promise<void>;
  hasValidRegistrationInvite(email: string, executor?: QueryExecutor): Promise<boolean>;
  upsertRegistrationInvite(email: string, invitedBy: string, expiresAt: Date, executor?: QueryExecutor): Promise<void>;
  consumeRegistrationInvite(email: string, executor?: QueryExecutor): Promise<void>;
}
