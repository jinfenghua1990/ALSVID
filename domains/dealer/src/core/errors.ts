import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class DealerValidationError extends ValidationError{constructor(message:string){super('DEALER_VALIDATION',message)}}
export class DealerNotFoundError extends NotFoundError{constructor(message:string){super('DEALER_NOT_FOUND',message)}}
export class DealerConflictError extends ConflictError{constructor(message:string){super('DEALER_CONFLICT',message)}}
