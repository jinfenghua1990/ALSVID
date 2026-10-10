export type DomainErrorKind =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'INTEGRATION'
  | 'INTERNAL';

export class DomainError extends Error {
  readonly kind: DomainErrorKind;
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(kind: DomainErrorKind, code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = new.target.name;
    this.kind = kind;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super('VALIDATION', code, message, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super('NOT_FOUND', code, message, details);
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super('CONFLICT', code, message, details);
  }
}

export class ForbiddenError extends DomainError {
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super('FORBIDDEN', code, message, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super('UNAUTHORIZED', code, message, details);
  }
}

export class IntegrationError extends DomainError {
  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super('INTEGRATION', code, message, details);
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
