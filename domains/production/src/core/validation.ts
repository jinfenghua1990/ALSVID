import{ProductionValidationError}from'./errors.js';import type{QcResult}from'./model.js';
export function positiveProductionInteger(value:number,name:string):number{if(!Number.isSafeInteger(value)||value<1)throw new ProductionValidationError(`${name} must be a positive integer`);return value}
export function positiveProductionDecimal(value:string|number,name:string):string{const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text)||Number(text)<=0)throw new ProductionValidationError(`${name} must be a positive decimal`);return text}
export function assertQcResult(value:string):asserts value is QcResult{if(!['PASS','FAIL','HOLD'].includes(value))throw new ProductionValidationError('result must be PASS, FAIL or HOLD')}
