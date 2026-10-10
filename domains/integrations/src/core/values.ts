import{IntegrationValidationError}from'./errors.js';
export function integrationText(value:unknown):string|null{if(value===undefined||value===null)return null;const result=String(value).trim();return result||null}
export function integrationRequired(value:unknown,name:string):string{const result=integrationText(value);if(!result)throw new IntegrationValidationError(`${name} is required`);return result}
export function integrationObject(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>: {}}
export function integrationArray(value:unknown):unknown[]{return Array.isArray(value)?value:[]}
export function integrationTimestamp(value:unknown):string|undefined{const result=integrationText(value);if(!result)return undefined;const millis=Date.parse(result);if(Number.isNaN(millis))throw new IntegrationValidationError(`Invalid timestamp: ${result}`);return new Date(millis).toISOString()}
