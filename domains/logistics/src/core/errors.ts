import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class LogisticsValidationError extends ValidationError{constructor(message:string){super('LOGISTICS_VALIDATION',message)}}
export class LogisticsNotFoundError extends NotFoundError{constructor(message:string){super('LOGISTICS_NOT_FOUND',message)}}
export class LogisticsConflictError extends ConflictError{constructor(message:string){super('LOGISTICS_CONFLICT',message)}}
