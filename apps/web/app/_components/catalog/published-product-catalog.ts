/** Strict WWW-facing projection of reviewed product content.
 * No internal SKU, cost, supplier, BOM, payment or inventory information.
 */
export type PublishedBike={
 modelId:string;code:'FC1'|'FC2';type:'BIKE';image:string;
 title:{zh:string;de:string;en:string};
};
export type PublishedBikeResult={items:readonly PublishedBike[];suppressedCodes:readonly ('FC1'|'FC2')[];available:boolean};
const allowedImages:Record<PublishedBike['code'],string>={
 FC1:'/home/original/fc1-product.webp',
 FC2:'/products/fc2/side-studio-1536.webp',
};
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
function validPublishedBike(value:unknown):value is PublishedBike{
 if(!value||typeof value!=='object')return false;
 const p=value as Record<string,unknown>;
 if(p.code!=='FC1'&&p.code!=='FC2')return false;
 if(p.type!=='BIKE'||p.image!==allowedImages[p.code]||typeof p.modelId!=='string'||!uuid.test(p.modelId))return false;
 if(!p.title||typeof p.title!=='object')return false;
 const t=p.title as Record<string,unknown>;
 return ['zh','de','en'].every(locale=>typeof t[locale]==='string'&&
  t[locale].trim().length>=2&&t[locale].length<=120);
}
export async function publishedBikeCatalog():Promise<PublishedBikeResult>{
 const base=process.env.ALSVID_API_BASE_URL;
 if(!base)return {items:[],suppressedCodes:[],available:false};
 try{
  const response=await fetch(base+'/v1/product/public/catalog',{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return {items:[],suppressedCodes:[],available:false};
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=='object'||!('data' in payload)||!payload.data||
    typeof payload.data!=='object')return {items:[],suppressedCodes:[],available:false};
  const data=payload.data as {items?:unknown;suppressedCodes?:unknown};
  if(!Array.isArray(data.items)||!Array.isArray(data.suppressedCodes))
    return {items:[],suppressedCodes:[],available:false};
  const items=data.items.filter(validPublishedBike);
  const suppressedCodes:('FC1'|'FC2')[]=data.suppressedCodes.filter(
    (code:unknown):code is 'FC1'|'FC2'=>code==='FC1'||code==='FC2');
  return {items,suppressedCodes,available:true};
 }catch{return {items:[],suppressedCodes:[],available:false};}
}
