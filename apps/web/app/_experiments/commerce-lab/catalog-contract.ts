export type LabLocaleText={zh:string;de:string;en:string};
export type LabSpecification={label:LabLocaleText;value:LabLocaleText;featured:boolean};
export type LabProductStatus='DRAFT'|'PUBLISHED'|'ARCHIVED';
export type LabComparisonProduct={id:string;code:string;title:LabLocaleText;description:LabLocaleText;
  specifications:LabSpecification[];referenceImage:'FC1'|'FC2'|null;proposedPriceMinor:number|null;currency:'EUR';status:LabProductStatus;version:number;updatedAt:string;hasCustomImage:boolean};
export type LabPublishedProduct=LabComparisonProduct&{status:'PUBLISHED'};
export type LabCatalogSnapshot={state:'connected'|'unavailable';products:LabPublishedProduct[];total:number;page:number;limit:number;query:string;checkedAt:string};
function localized(value:unknown,max:number,required:boolean):LabLocaleText{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid localized text');
  const source=value as Record<string,unknown>,output={} as LabLocaleText;
  for(const lang of ['zh','de','en'] as const){
    const text=source[lang];
    if(typeof text!=='string'||text.length>max||(required&&!text.trim()))throw new Error('Invalid localized text');
    output[lang]=text;
  }return output;
}
function specifications(value:unknown):LabSpecification[]{
  if(value===undefined)return[];
  if(!Array.isArray(value)||value.length>20)throw new Error('Invalid specifications');
  const result=value.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.featured!=='boolean')throw new Error('Invalid specification');
    return{label:localized(item.label,60,true),value:localized(item.value,160,true),featured:item.featured as boolean};
  });
  if(result.filter(row=>row.featured).length>4)throw new Error('Invalid featured specifications');
  return result;
}
function product(value:unknown,allowed:readonly LabProductStatus[]):LabComparisonProduct{
  const row=value as Record<string,unknown>|null;
  if(!row||Array.isArray(row)||typeof row.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.id)||
    typeof row.code!=='string'||!/^[A-Z0-9][A-Z0-9_-]{1,40}$/.test(row.code)||
    !allowed.includes(row.status as LabProductStatus)||row.currency!=='EUR'||typeof row.hasCustomImage!=='boolean'||
    !Number.isSafeInteger(row.version)||(row.version as number)<1||
    typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt))||
    ![null,'FC1','FC2'].includes(row.referenceImage as string|null)||
    (row.proposedPriceMinor!==null&&(!Number.isSafeInteger(row.proposedPriceMinor)||(row.proposedPriceMinor as number)<0||
      (row.proposedPriceMinor as number)>100000000)))throw new Error('Invalid comparison product');
  return{id:row.id,code:row.code,specifications:specifications(row.specifications),title:localized(row.title,120,true),description:localized(row.description,2000,false),
    referenceImage:row.referenceImage as LabComparisonProduct['referenceImage'],proposedPriceMinor:row.proposedPriceMinor as number|null,
    currency:'EUR',status:row.status as LabProductStatus,version:row.version as number,updatedAt:row.updatedAt,hasCustomImage:row.hasCustomImage as boolean};
}
export function parseLabProducts(value:unknown):{products:LabPublishedProduct[];total:number}{
  const data=(value as {data?:{items?:unknown;total?:unknown}}|null)?.data;
  if(!data||!Array.isArray(data.items)||data.items.length>100||!Number.isSafeInteger(data.total)||(data.total as number)<data.items.length)
    throw new Error('Invalid comparison catalog response');
  const ids=new Set<string>();
  const products=data.items.map((value:unknown)=>{
    const row=product(value,['PUBLISHED']) as LabPublishedProduct;
    if(ids.has(row.id))throw new Error('Duplicate comparison product');
    ids.add(row.id);return row;
  });
  return{products,total:data.total as number};
}
/** Call only after server-side Admin authentication; public parsing remains published-only. */
export function parseAdminLabProduct(value:unknown):LabComparisonProduct{
  return product((value as {data?:unknown}|null)?.data,['DRAFT','PUBLISHED','ARCHIVED']);
}

/** Public detail uses the same publication allowlist as the public catalog. */
export function parsePublishedLabProduct(value:unknown):LabPublishedProduct{
  return product((value as {data?:unknown}|null)?.data,['PUBLISHED']) as LabPublishedProduct;
}
