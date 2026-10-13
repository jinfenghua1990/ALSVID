import { ConflictError, ForbiddenError, IntegrationError, UnauthorizedError, ValidationError } from '@alsvid/kernel';

export class PermissionDeniedError extends ForbiddenError {
  constructor(permission: string) { super('IDENTITY_PERMISSION_DENIED', `Missing permission: ${permission}`, { permission }); }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() { super('IDENTITY_INVALID_CREDENTIALS', 'Invalid email or password'); }
}

export class InvalidEmailCodeError extends UnauthorizedError {
  constructor() { super('IDENTITY_INVALID_EMAIL_CODE', 'Verification code is invalid or expired'); }
}

export class InternalRegistrationDeniedError extends ForbiddenError {
  constructor() { super('IDENTITY_REGISTRATION_DENIED', 'This email is not eligible for ALSVID Internal registration'); }
}

export class EmailVerificationRateLimitError extends ConflictError {
  constructor() { super('IDENTITY_EMAIL_CODE_RATE_LIMIT', 'A verification code was requested recently. Please wait before requesting another code.'); }
}

export class IdentityMailUnavailableError extends IntegrationError {
  constructor() { super('IDENTITY_MAIL_UNAVAILABLE', 'Email verification is not configured for this environment'); }
}

export class IdentityValidationError extends ValidationError {
  constructor(message: string) { super('IDENTITY_VALIDATION', message); }
}

export class InvalidPasswordResetTokenError extends UnauthorizedError {
  constructor() { super('IDENTITY_INVALID_PASSWORD_RESET_TOKEN', 'This password reset link is invalid or expired'); }
}
