import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher, SessionTokenService } from '../application/ports.js';
import { IdentityValidationError } from '../core/errors.js';

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    if (password.length < 12) throw new IdentityValidationError('Password must be at least 12 characters');
    const salt = randomBytes(16);
    const derived = await scryptAsync(password, salt);
    return `scrypt$16384$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
  }
  async verify(password: string, encoded: string): Promise<boolean> {
    const [algorithm,n,r,p,saltText,hashText] = encoded.split('$');
    if (algorithm !== 'scrypt' || n !== '16384' || r !== '8' || p !== '1' || !saltText || !hashText) return false;
    const derived = await scryptAsync(password, Buffer.from(saltText, 'base64url'));
    const expected = Buffer.from(hashText, 'base64url');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }
}

export class SecureSessionTokenService implements SessionTokenService {
  create(): string { return randomBytes(32).toString('base64url'); }
  hash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
}

const defaultPasswords = new ScryptPasswordHasher();
export function hashPassword(password: string): Promise<string> { return defaultPasswords.hash(password); }
export function verifyPassword(password: string, encoded: string): Promise<boolean> { return defaultPasswords.verify(password, encoded); }
