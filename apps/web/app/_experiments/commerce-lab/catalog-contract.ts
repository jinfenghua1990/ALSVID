export type LabLocaleText={zh:string;de:string;en:string};
export type LabProductStatus='DRAFT'|'PUBLISHED'|'ARCHIVED';
export type LabComparisonProduct={id:string;code:string;title:LabLocaleText;description:LabLocaleText;
  referenceImage:'FC1'|'FC2'|null;proposedPriceMinor:number|null;currency:'EUR';status:LabProductStatus;version:number;updatedAt:string};
export type LabPublishedProduct=LabComparisonProduct&{status:'PUBLISHED'};
export type LabCatalogSnapshot={state:'connected'|'unavailable';products:LabPublishedProduct[];total:number;checkedAt:string};
function localized(value:unknown,max:number,required:boolean):LabLocaleText{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid localized text');
  const source=value as Record<string,unknown>,output={} as LabLocaleText;
  for(const lang of ['zh','de','en'] as const){
    const text=source[lang];
    if(typeof text!=='string'||text.length>max||(required&&!text.trim()))throw new Error('Invalid localized text');
    output[lang]=text;
  }return output;
}
function product(value:unknown,allowed:readonly LabProductStatus[]):LabComparisonProduct{
  const row=value as Record<string,unknown>|null;
  if(!row||Array.isArray(row)||typeof row.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.id)||
    typeof row.code!=='string'||!/^[A-Z0-9][A-Z0-9_-]{1,40}$/.test(row.code)||
    !allowed.includes(row.status as LabProductStatus)||row.currency!=='EUR'||
    !Number.isSafeInteger(row.version)||(row.version as number)<1||
    typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt))||
    ![null,'FC1','FC2'].includes(row.referenceImage as string|null)||
    (row.proposedPriceMinor!==null&&(!Number.isSafeInteger(row.proposedPriceMinor)||(row.proposedPriceMinor as number)<0||
      (row.proposedPriceMinor as number)>100000000)))throw new Error('Invalid comparison product');
  return{id:row.id,code:row.code,title:localized(row.title,120,true),description:localized(row.description,2000,false),
    referenceImage:row.referenceImage as LabComparisonProduct['referenceImage'],proposedPriceMinor:row.proposedPriceMinor as number|null,
    currency:'EUR',status:row.status as LabProductStatus,version:row.version as number,updatedAt:row.updatedAt};
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
