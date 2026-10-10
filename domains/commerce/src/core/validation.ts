import{CommerceValidationError}from'./errors.js';
export function commerceNonempty(value:string|undefined,name:string):string{const text=value?.trim();if(!text)throw new CommerceValidationError(`${name} is required`);return text}
export function commerceCurrency(value:string):string{const text=value.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(text))throw new CommerceValidationError('currency must be ISO alpha-3');return text}
export function commerceDecimal(value:string|number,name:string,allowZero=true):string{const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text)||(!allowZero&&/^0+(?:\.0+)?$/.test(text)))throw new CommerceValidationError(`${name} must be ${allowZero?'zero or ':''}a positive decimal`);return text}
