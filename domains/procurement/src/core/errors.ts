import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class ProcurementValidationError extends ValidationError{constructor(message:string){super('PROCUREMENT_VALIDATION',message)}}
export class ProcurementNotFoundError extends NotFoundError{constructor(message:string){super('PROCUREMENT_NOT_FOUND',message)}}
export class ProcurementConflictError extends ConflictError{constructor(message:string){super('PROCUREMENT_CONFLICT',message)}}
