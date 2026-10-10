import { ConflictError, NotFoundError, ValidationError } from '@alsvid/kernel';
export class PartnerValidationError extends ValidationError{constructor(message:string){super('PARTNER_VALIDATION',message);}}
export class PartnerNotFoundError extends NotFoundError{constructor(message:string){super('PARTNER_NOT_FOUND',message);}}
export class PartnerConflictError extends ConflictError{constructor(message:string){super('PARTNER_CONFLICT',message);}}
