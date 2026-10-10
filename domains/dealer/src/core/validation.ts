import{DealerValidationError}from'./errors.js';import type{DealerStatus}from'./model.js';
export function normalizeDealerCountries(values:string[]|null|undefined):string[]{return[...new Set((values??[]).map(v=>v.trim().toUpperCase()).filter(Boolean))]}
export function assertDealerVersion(value:number):void{if(!Number.isSafeInteger(value)||value<1)throw new DealerValidationError('expectedVersion is required')}
export function assertDealerStatus(value:string):asserts value is DealerStatus{if(!['PROSPECT','ACTIVE','SUSPENDED','CLOSED'].includes(value))throw new DealerValidationError('Invalid Dealer status')}
