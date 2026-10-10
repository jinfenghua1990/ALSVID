import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class InventoryValidationError extends ValidationError{constructor(message:string){super('INVENTORY_VALIDATION',message)}}
export class InventoryNotFoundError extends NotFoundError{constructor(message:string){super('INVENTORY_NOT_FOUND',message)}}
export class InventoryConflictError extends ConflictError{constructor(message:string){super('INVENTORY_CONFLICT',message)}}
