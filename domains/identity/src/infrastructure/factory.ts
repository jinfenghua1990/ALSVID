import type { DatabasePort } from '@alsvid/database';
import type { IdentityAuditPort } from '../application/ports.js';
import { IdentityService } from '../application/identity-service.js';
import { SecureSessionTokenService, ScryptPasswordHasher } from './crypto.js';
import { PostgresIdentityRepository } from './postgres-identity-repository.js';

// ALSVID_MIN_PASSWORD_LENGTH lets Development/Test environments relax the
// production default of 12 characters; Production never sets it.
function minPasswordLength(): number {
  const value = Number.parseInt(process.env.ALSVID_MIN_PASSWORD_LENGTH ?? '', 10);
  return Number.isInteger(value) && value > 0 ? value : 12;
}

export function createIdentityService(database:DatabasePort,audit:IdentityAuditPort):IdentityService{return new IdentityService(new PostgresIdentityRepository(database),audit,new ScryptPasswordHasher(minPasswordLength()),new SecureSessionTokenService());}
