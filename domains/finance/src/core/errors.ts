import { ConflictError, NotFoundError, ValidationError } from '@alsvid/kernel';
export class FinanceValidationError extends ValidationError{constructor(message:string){super('FINANCE_VALIDATION',message)}}
export class FinanceNotFoundError extends NotFoundError{constructor(message:string){super('FINANCE_NOT_FOUND',message)}}
export class FinanceConflictError extends ConflictError{constructor(message:string){super('FINANCE_CONFLICT',message)}}
