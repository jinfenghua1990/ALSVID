import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class ProductionValidationError extends ValidationError{constructor(message:string){super('PRODUCTION_VALIDATION',message)}}
export class ProductionNotFoundError extends NotFoundError{constructor(message:string){super('PRODUCTION_NOT_FOUND',message)}}
export class ProductionConflictError extends ConflictError{constructor(message:string){super('PRODUCTION_CONFLICT',message)}}
