import{ConflictError,NotFoundError,ValidationError}from'@alsvid/kernel';
export class VehicleValidationError extends ValidationError{constructor(message:string){super('VEHICLE_VALIDATION',message)}}
export class VehicleNotFoundError extends NotFoundError{constructor(message:string){super('VEHICLE_NOT_FOUND',message)}}
export class VehicleConflictError extends ConflictError{constructor(message:string){super('VEHICLE_CONFLICT',message)}}
