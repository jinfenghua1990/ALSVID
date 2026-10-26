import 'server-only';
import {parseLabProducts,type LabCatalogSnapshot} from './catalog-contract';
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
