import { FinanceValidationError } from './errors.js';
import type { FinanceSourceType } from './model.js';
export function financeCurrency(value:string):string{const result=value.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(result))throw new FinanceValidationError('currency must be a three-letter uppercase code');return result}
export function financePositive(value:string|number,name:string):string{const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text)||Number(text)<=0)throw new FinanceValidationError(`${name} must be a positive decimal`);return text}
export function financeNonNegative(value:string|number,name:string):string{const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text))throw new FinanceValidationError(`${name} must be zero or a positive decimal`);return text}
export function financeRequired(value:unknown,name:string):string{const result=String(value??'').trim();if(!result)throw new FinanceValidationError(`${name} is required`);return result}
export function financeVersion(value:number):void{if(!Number.isSafeInteger(value)||value<1)throw new FinanceValidationError('expectedVersion is required')}
export function financeSource(input:{sourceType?:FinanceSourceType;sourceId?:string}):{sourceType:FinanceSourceType;sourceId:string|null}{const sourceType=input.sourceType??'MANUAL';if(!['PROCUREMENT_PO','COMMERCE_ORDER','LOGISTICS_SHIPMENT','MANUAL'].includes(sourceType))throw new FinanceValidationError('Invalid Finance source type');if(sourceType==='MANUAL')return{sourceType,sourceId:null};if(!input.sourceId)throw new FinanceValidationError('sourceId is required for non-manual Finance source');return{sourceType,sourceId:input.sourceId}}

export function financeEffectiveAt(value:unknown):string{
  const text=String(value??'').trim();
  if(!text)throw new FinanceValidationError('effectiveAt is required');
  // Require an explicit timezone: Z or numeric ±HH:MM. Reject date-only and timezone-less local datetimes.
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)){
    throw new FinanceValidationError('effectiveAt must be an ISO-8601 datetime with timezone (Z or ±HH:MM)');
  }
  const parsed=Date.parse(text);
  if(Number.isNaN(parsed))throw new FinanceValidationError('effectiveAt must be a valid ISO-8601 datetime with timezone (Z or ±HH:MM)');
  return text;
}
