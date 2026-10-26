import { CommerceValidationError } from './errors.js';
export type ComparisonLocaleText = { zh: string; de: string; en: string };
export interface ComparisonSpecification { label:ComparisonLocaleText; value:ComparisonLocaleText; featured:boolean }
export type ComparisonStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export interface ComparisonCatalogProduct {
  id: string; code: string; title: ComparisonLocaleText; description: ComparisonLocaleText;
  referenceImage: 'FC1' | 'FC2' | null; proposedPriceMinor: number | null; currency: 'EUR';
  specifications:ComparisonSpecification[];
  status: ComparisonStatus; version: number; createdAt: string; updatedAt: string; hasCustomImage: boolean;
}
export interface ComparisonProductFields {
  specifications?:ComparisonSpecification[];
  title: ComparisonLocaleText; description: ComparisonLocaleText;
  referenceImage: 'FC1' | 'FC2' | null; proposedPriceMinor: number | null;
}
export type ComparisonCreateInput = ComparisonProductFields & { code: string };
export type ComparisonUpdateInput = ComparisonProductFields & { expectedVersion: number; status: ComparisonStatus };
export type ComparisonListQuery = { page: number; limit: number; query: string };
export interface ComparisonProductPage { items: ComparisonCatalogProduct[]; total: number; page: number; limit: number }
function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CommerceValidationError('Expected an object');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some(key => !allowed.includes(key))) throw new CommerceValidationError('Unsupported comparison product field');
  return row;
}
function localized(value: unknown, required: boolean, max: number): ComparisonLocaleText {
  const row = object(value, ['zh','de','en']);
  const output = {} as ComparisonLocaleText;
  for (const locale of ['zh','de','en'] as const) {
    const text = row[locale];
    if (typeof text !== 'string' || text.length > max || (required && !text.trim()))
      throw new CommerceValidationError('Invalid localized comparison product text');
    output[locale] = text.trim();
  }
  return output;
}
function specifications(value:unknown):ComparisonSpecification[]{
  if(!Array.isArray(value)||value.length>20)throw new CommerceValidationError('Use at most 20 product specifications');
  const result=value.map(item=>{
    const row=object(item,['label','value','featured']);
    if(typeof row.featured!=='boolean')throw new CommerceValidationError('Specification featured must be boolean');
    return{label:localized(row.label,true,60),value:localized(row.value,true,160),featured:row.featured};
  });
  if(result.filter(row=>row.featured).length>4)throw new CommerceValidationError('Choose at most 4 card specifications');
  return result;
}
function fields(row: Record<string, unknown>): ComparisonProductFields {
  if (row.referenceImage !== null && row.referenceImage !== 'FC1' && row.referenceImage !== 'FC2')
    throw new CommerceValidationError('Unsupported reference image');
  if (row.proposedPriceMinor !== null && (!Number.isSafeInteger(row.proposedPriceMinor) ||
      (row.proposedPriceMinor as number) < 0 || (row.proposedPriceMinor as number) > 100000000))
    throw new CommerceValidationError('Proposed price must use bounded integer minor units');
  return { title:localized(row.title,true,120), description:localized(row.description,false,2000),
    referenceImage:row.referenceImage as ComparisonProductFields['referenceImage'],
    proposedPriceMinor:row.proposedPriceMinor as number | null,
    ...(row.specifications===undefined?{}:{specifications:specifications(row.specifications)}) };
}
export function comparisonCreate(value: unknown): ComparisonCreateInput {
  const row = object(value,['code','title','description','referenceImage','proposedPriceMinor','specifications']);
  if (typeof row.code !== 'string' || !/^[A-Z0-9][A-Z0-9_-]{1,40}$/.test(row.code))
    throw new CommerceValidationError('Use an uppercase comparison product code');
  return { code:row.code,...fields(row) };
}
export function comparisonUpdate(value: unknown): ComparisonUpdateInput {
  const row = object(value,['title','description','referenceImage','proposedPriceMinor','specifications','status','expectedVersion']);
  if (!Number.isSafeInteger(row.expectedVersion) || (row.expectedVersion as number) < 1)
    throw new CommerceValidationError('A positive expectedVersion is required');
  if (!['DRAFT','PUBLISHED','ARCHIVED'].includes(row.status as string))
    throw new CommerceValidationError('Invalid comparison publication state');
  return { ...fields(row),expectedVersion:row.expectedVersion as number,status:row.status as ComparisonStatus };
}
export function comparisonId(value: string): string {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))
    throw new CommerceValidationError('Invalid comparison product ID');
  return value;
}
export function comparisonList(value: {page?:unknown;limit?:unknown;query?:unknown}): ComparisonListQuery {
  const page = value.page === undefined ? 1 : Number(value.page);
  const limit = value.limit === undefined ? 20 : Number(value.limit);
  const query = value.query === undefined ? '' : value.query;
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
      typeof query !== 'string' || query.length > 120)
    throw new CommerceValidationError('Invalid comparison catalog pagination or search');
  return {page,limit,query:query.trim()};
}
