import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class EngineeringValidationError extends ValidationError{constructor(message:string){super('ENGINEERING_VALIDATION',message)}}
export class EngineeringNotFoundError extends NotFoundError{constructor(message:string){super('ENGINEERING_NOT_FOUND',message)}}
export class EngineeringConflictError extends ConflictError{constructor(message:string){super('ENGINEERING_CONFLICT',message)}}
