import 'server-only';
import {cookies} from 'next/headers';
import {readPortalSession} from '../../_lib/portal-access';
import {sessionCookieNameForPortal} from '../../_lib/session-cookie';
import {parseAdminLabProduct,type LabComparisonProduct} from './catalog-contract';
const apiBase=process.env.ALSVID_API_BASE_URL??'';
export type AdminProductSnapshot={state:'ready';product:LabComparisonProduct}|{state:'forbidden'|'not-found'|'unavailable'};
export async function readComparisonAdminProduct(id:string):Promise<AdminProductSnapshot>{
  const session=await readPortalSession('admin');
  if(!session?.roles.includes('system_admin')||!session.permissions.includes('commerce.read'))return{state:'forbidden'};
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return{state:'not-found'};
  const token=(await cookies()).get(sessionCookieNameForPortal('admin'))?.value;
  if(!token)return{state:'forbidden'};
  try{
    const response=await fetch(apiBase+'/v1/commerce-lab/products/'+id,{headers:{authorization:'Bearer '+token},
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(response.status===401||response.status===403)return{state:'forbidden'};
    if(response.status===404)return{state:'not-found'};
    if(!response.ok)throw new Error('Admin product unavailable');
    return{state:'ready',product:parseAdminLabProduct(await response.json())};
  }catch{return{state:'unavailable'};}
}
