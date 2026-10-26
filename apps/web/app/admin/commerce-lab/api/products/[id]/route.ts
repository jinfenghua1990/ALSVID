import { comparisonAdminProxy } from '../../../../../_experiments/commerce-lab/admin-proxy.server';
export const dynamic='force-dynamic';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;return comparisonAdminProxy(request,'PATCH',id);
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;return comparisonAdminProxy(request,'GET',id);
}
