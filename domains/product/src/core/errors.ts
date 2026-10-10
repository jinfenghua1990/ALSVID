import { ConflictError, NotFoundError, ValidationError } from '@alsvid/kernel';

export class ProductValidationError extends ValidationError {
  constructor(message: string) { super('PRODUCT_VALIDATION', message); }
}

export class ProductNotFoundError extends NotFoundError {
  constructor(message: string) { super('PRODUCT_NOT_FOUND', message); }
}

export class ProductConflictError extends ConflictError {
  constructor(message: string) { super('PRODUCT_CONFLICT', message); }
}
