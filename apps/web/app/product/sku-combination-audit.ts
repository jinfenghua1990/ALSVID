/** Read-only legacy SKU collision report. Does not mutate catalog, payments or stock. */
export type SkuDimensionRow = {
 id:string;variant_id:string;sku:string;status:string;
 market_code:string|null;color_code:string|null;size_code:string|null;
};
export type SkuCombinationCollision={
 variantId:string;market:string;color:string;size:string;skus:string[];
};
const normalize=(value:string|null):string=>(value??'').trim().toUpperCase();

/** Report only non-retired rows where at least one selling dimension is present.
 * Legacy all-empty variants cannot be assumed accidental duplicates. */
export function findActiveSkuCombinationDuplicates(
 records:readonly SkuDimensionRow[],
):SkuCombinationCollision[]{
 const map=new Map<string,SkuCombinationCollision>();
 for(const sku of records){
  if(sku.status==='RETIRED')continue;
  const market=normalize(sku.market_code),color=normalize(sku.color_code),
    size=normalize(sku.size_code);
  if(!market&&!color&&!size)continue;
  const key=JSON.stringify([sku.variant_id,market,color,size]);
  let collision=map.get(key);
  if(!collision){collision={variantId:sku.variant_id,market,color,size,skus:[]};map.set(key,collision);}
  collision.skus.push(sku.sku);
 }
 return Array.from(map.values())
  .filter(x=>x.skus.length>1)
  .sort((a,b)=>a.variantId.localeCompare(b.variantId)||a.market.localeCompare(b.market)||
    a.color.localeCompare(b.color)||a.size.localeCompare(b.size));
}
