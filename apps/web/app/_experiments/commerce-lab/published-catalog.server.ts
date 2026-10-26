import 'server-only';
import {cache} from 'react';
import {parseLabProducts,parsePublishedLabProduct,type LabPublishedProduct,type LabCatalogSnapshot} from './catalog-contract';
const apiBase=process.env.ALSVID_API_BASE_URL??'http://localhost:4000/api';
export async function publishedComparisonCatalog():Promise<LabCatalogSnapshot>{
  const checkedAt=new Date().toISOString();
  try{
    const response=await fetch(apiBase+'/v1/commerce-lab/public/products?limit=100',{
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Comparison catalog unavailable');
    return{state:'connected',...parseLabProducts(await response.json()),checkedAt};
  }catch{return{state:'unavailable',products:[],total:0,checkedAt};}
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
