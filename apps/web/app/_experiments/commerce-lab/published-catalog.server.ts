import 'server-only';
import {cache} from 'react';
import {parseLabProducts,parsePublishedLabProduct,type LabPublishedProduct,type LabCatalogSnapshot} from './catalog-contract';
const apiBase=process.env.ALSVID_API_BASE_URL??'';
const comparisonPageSize=20;
export async function publishedComparisonCatalog(page=1,query=''):Promise<LabCatalogSnapshot>{
  const checkedAt=new Date().toISOString();
  const safePage=Number.isSafeInteger(page)&&page>=1&&page<=10000?page:1;
  const safeQuery=query.trim().slice(0,120);
  const params=new URLSearchParams({page:String(safePage),limit:String(comparisonPageSize),query:safeQuery});
  try{
    const response=await fetch(apiBase+'/v1/commerce-lab/public/products?'+params,{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Comparison catalog unavailable');
    return{state:'connected',...parseLabProducts(await response.json()),page:safePage,limit:comparisonPageSize,query:safeQuery,checkedAt};
  }catch{return{state:'unavailable',products:[],total:0,page:safePage,limit:comparisonPageSize,query:safeQuery,checkedAt};}
}

export type PublishedProductSnapshot={state:'ready';product:LabPublishedProduct}|{state:'not-found'|'unavailable'};
export const publishedComparisonProduct=cache(async(id:string):Promise<PublishedProductSnapshot>=>{
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return{state:'not-found'};
  try{
    const response=await fetch(apiBase+'/v1/commerce-lab/public/products/'+encodeURIComponent(id),{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(response.status===404)return{state:'not-found'};
    if(!response.ok)throw new Error('Comparison product unavailable');
    return{state:'ready',product:parsePublishedLabProduct(await response.json())};
  }catch{return{state:'unavailable'};}
});
