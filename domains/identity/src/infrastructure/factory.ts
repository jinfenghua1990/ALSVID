import type { DatabasePort } from '@alsvid/database';
import type { IdentityAuditPort, IdentityPasswordResetDelivery, IdentityRegistrationPolicy, IdentityVerificationDelivery, InternalRegistrationMode } from '../application/ports.js';
import { IdentityService } from '../application/identity-service.js';
import { SecureOneTimeCodeService, SecureSessionTokenService, ScryptPasswordHasher } from './crypto.js';
import { PostgresIdentityRepository } from './postgres-identity-repository.js';

export interface CreateIdentityServiceOptions {
  verificationDelivery?: IdentityVerificationDelivery;
  passwordResetDelivery?: IdentityPasswordResetDelivery;
  approvedEmailDomains?: readonly string[];
  registrationMode?: InternalRegistrationMode;
  initialAdminEmail?: string | null;
  exposeTestCode?: boolean;
  verificationTtlMs?: number;
  resendCooldownMs?: number;
  maxVerificationAttempts?: number;
}

function minPasswordLength(): number {
  const value = Number.parseInt(process.env.ALSVID_MIN_PASSWORD_LENGTH ?? '', 10);
  return Number.isInteger(value) && value > 0 ? value : 12;
}

const unavailableDelivery: IdentityVerificationDelivery = {
  configured: false,
  async sendCode() { throw new Error('Email verification delivery is not configured'); },
};

const unavailablePasswordResetDelivery: IdentityPasswordResetDelivery = {
  configured: false,
  async sendResetEmail() { throw new Error('Password reset email delivery is not configured'); },
};

export function createIdentityService(database: DatabasePort, audit: IdentityAuditPort, options: CreateIdentityServiceOptions = {}): IdentityService {
  const policy: IdentityRegistrationPolicy = {
    approvedEmailDomains: options.approvedEmailDomains ?? [],
    registrationMode: options.registrationMode ?? 'company_domain',
    initialAdminEmail: options.initialAdminEmail?.trim().toLowerCase() || null,
    verificationTtlMs: options.verificationTtlMs ?? 10 * 60 * 1000,
    resendCooldownMs: options.resendCooldownMs ?? 60 * 1000,
    maxVerificationAttempts: options.maxVerificationAttempts ?? 5,
    exposeTestCode: options.exposeTestCode ?? false,
  };
  return new IdentityService(
    new PostgresIdentityRepository(database),
    audit,
    new ScryptPasswordHasher(minPasswordLength()),
    new SecureOneTimeCodeService(),
    new SecureSessionTokenService(),
    options.verificationDelivery ?? unavailableDelivery,
    policy,
  );
}
