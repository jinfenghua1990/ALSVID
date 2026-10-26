export type LabLocaleText={zh:string;de:string;en:string};
export type LabPublishedProduct={id:string;code:string;title:LabLocaleText;description:LabLocaleText;
  referenceImage:'FC1'|'FC2'|null;proposedPriceMinor:number|null;currency:'EUR';status:'PUBLISHED';version:number;updatedAt:string};
export type LabCatalogSnapshot={state:'connected'|'unavailable';products:LabPublishedProduct[];total:number;checkedAt:string};
export function parseLabProducts(value:unknown):{products:LabPublishedProduct[];total:number}{
  const data=(value as {data?:{items?:unknown;total?:unknown}}|null)?.data;
  if(!data||!Array.isArray(data.items)||data.items.length>100||!Number.isSafeInteger(data.total)||(data.total as number)<data.items.length)
    throw new Error('Invalid comparison catalog response');
  const ids=new Set<string>();
  const text=(value:unknown,max:number):LabLocaleText=>{
    if(!value||typeof value!=='object')throw new Error('Invalid localized text');
    const source=value as Record<string,unknown>,output={} as LabLocaleText;
    for(const lang of ['zh','de','en'] as const){
      if(typeof source[lang]!=='string'||(source[lang] as string).length>max)throw new Error('Invalid localized text');
      output[lang]=source[lang] as string;
    }return output;
  };
  const products=data.items.map((value:unknown):LabPublishedProduct=>{
    const row=value as Record<string,unknown>|null;
    if(!row||typeof row.id!=='string'||!/^[a-f0-9-]{36}$/i.test(row.id)||ids.has(row.id)||
      typeof row.code!=='string'||row.status!=='PUBLISHED'||row.currency!=='EUR'||
      !Number.isSafeInteger(row.version)||(row.version as number)<1||
      typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt))||
      ![null,'FC1','FC2'].includes(row.referenceImage as string|null)||
      (row.proposedPriceMinor!==null&&(!Number.isSafeInteger(row.proposedPriceMinor)||(row.proposedPriceMinor as number)<0||
        (row.proposedPriceMinor as number)>100000000)))throw new Error('Invalid published comparison product');
    ids.add(row.id);
    return{id:row.id,code:row.code,title:text(row.title,120),description:text(row.description,2000),
      referenceImage:row.referenceImage as LabPublishedProduct['referenceImage'],
      proposedPriceMinor:row.proposedPriceMinor as number|null,currency:'EUR',status:'PUBLISHED',
      version:row.version as number,updatedAt:row.updatedAt};
  });
  return{products,total:data.total as number};
}
