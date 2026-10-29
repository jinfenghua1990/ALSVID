import {publishedComparisonProduct} from '../../../_experiments/commerce-lab/published-catalog.server';

export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const result=await publishedComparisonProduct(id);
  const headers={'cache-control':'no-store'};
  if(result.state!=='ready')return Response.json({state:result.state},{status:result.state==='not-found'?404:503,headers});
  return Response.json({title:result.product.title},{headers});
}
