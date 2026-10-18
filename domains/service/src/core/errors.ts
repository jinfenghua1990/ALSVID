import { ConflictError, NotFoundError, ValidationError } from '@alsvid/kernel';
export class ServiceCaseValidationError extends ValidationError { constructor(message: string) { super('SERVICE_CASE_VALIDATION',message); } }
export class ServiceCaseConflictError extends ConflictError { constructor(message: string) { super('SERVICE_CASE_CONFLICT',message); } }
export class ServiceCaseNotFoundError extends NotFoundError { constructor(message: string) { super('SERVICE_CASE_NOT_FOUND',message); } }
