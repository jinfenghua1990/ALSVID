import type { DatabasePort } from '@alsvid/database';
import type { IdentityAuditPort } from '../application/ports.js';
import { IdentityService } from '../application/identity-service.js';
import { SecureSessionTokenService, ScryptPasswordHasher } from './crypto.js';
import { PostgresIdentityRepository } from './postgres-identity-repository.js';

export function createIdentityService(database:DatabasePort,audit:IdentityAuditPort):IdentityService{return new IdentityService(new PostgresIdentityRepository(database),audit,new ScryptPasswordHasher(),new SecureSessionTokenService());}
