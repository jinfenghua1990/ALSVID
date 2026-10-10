import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class CommerceValidationError extends ValidationError{constructor(message:string){super('COMMERCE_VALIDATION',message)}}
export class CommerceNotFoundError extends NotFoundError{constructor(message:string){super('COMMERCE_NOT_FOUND',message)}}
export class CommerceConflictError extends ConflictError{constructor(message:string){super('COMMERCE_CONFLICT',message)}}
