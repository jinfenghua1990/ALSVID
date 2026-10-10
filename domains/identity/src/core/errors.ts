import { ForbiddenError, UnauthorizedError, ValidationError } from '@alsvid/kernel';

export class PermissionDeniedError extends ForbiddenError {
  constructor(permission: string) { super('IDENTITY_PERMISSION_DENIED', `Missing permission: ${permission}`, { permission }); }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() { super('IDENTITY_INVALID_CREDENTIALS', 'Invalid email or password'); }
}

export class IdentityValidationError extends ValidationError {
  constructor(message: string) { super('IDENTITY_VALIDATION', message); }
}
