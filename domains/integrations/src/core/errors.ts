import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class IntegrationValidationError extends ValidationError{constructor(message:string){super('INTEGRATION_VALIDATION',message)}}
export class IntegrationNotFoundError extends NotFoundError{constructor(message:string){super('INTEGRATION_NOT_FOUND',message)}}
export class IntegrationConflictError extends ConflictError{constructor(message:string){super('INTEGRATION_CONFLICT',message)}}
