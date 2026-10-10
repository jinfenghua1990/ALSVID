import{EngineeringValidationError}from'./errors.js';
export function normalizeEngineeringCode(value:string):string{const code=value.trim().toUpperCase();if(!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code))throw new EngineeringValidationError('Code must use A-Z, 0-9, _ or -');return code;}
export function assertPositiveQuantity(value:number):void{if(!Number.isFinite(value)||value<=0)throw new EngineeringValidationError('quantity must be greater than zero');}
