import 'server-only';
import { cookies } from 'next/headers';
import { readPortalSession } from '../../_lib/portal-access';
import { sessionCookieNameForPortal } from '../../_lib/session-cookie';
const apiBase=process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';
const json=(body:unknown,status:number)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export async function comparisonAdminAuthorization(request:Request,write:boolean):Promise<{token:string}|{response:Response}>{
  const session=await readPortalSession('admin');
  if(!session)return{response:json({message:'请重新登录 Admin 后再操作'},401)};
  if(!session.roles.includes('system_admin')||!session.permissions.includes(write?'commerce.map':'commerce.read'))
    return{response:json({message:'当前账号没有独立商城操作权限'},403)};
  if(write){
    const origin=request.headers.get('origin');
    try{if(!origin||new URL(origin).host!==(request.headers.get('host')??new URL(request.url).host))
      return{response:json({message:'请在当前 Admin 页面提交操作'},403)};}
    catch{return{response:json({message:'请求来源无效'},403)};}
  }
  const token=(await cookies()).get(sessionCookieNameForPortal('admin'))?.value;
  return token?{token}:{response:json({message:'登录会话已失效'},401)};
}
export async function comparisonAdminProxy(request:Request,method:'GET'|'POST'|'PATCH',id?:string):Promise<Response>{
  const auth=await comparisonAdminAuthorization(request,method!=='GET');
  if('response' in auth)return auth.response;
  if(id&&!/^[a-f0-9-]{36}$/i.test(id))return json({message:'商品 ID 无效'},400);
  const token=auth.token;
  const url=new URL(apiBase+'/v1/commerce-lab/products'+(id?'/'+id:''));
  if(method==='GET'){
    const search=new URL(request.url).searchParams;
    for(const key of ['page','limit','query'])if(search.has(key))url.searchParams.set(key,search.get(key)!);
  }
  let body:string|undefined;
  if(method!=='GET'){
    if(Number(request.headers.get('content-length')??0)>65536)return json({message:'商品内容过大'},413);
    body=await request.text();
    if(new TextEncoder().encode(body).length>65536)return json({message:'商品内容过大'},413);
    try{JSON.parse(body);}catch{return json({message:'商品格式无效'},400);}
  }
  try{
    const response=await fetch(url,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
      ...(body===undefined?{}:{body}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.headers.get('content-type')?.includes('application/json'))return json({message:'后台暂时不可用'},502);
    return json(await response.json(),response.status);
  }catch{return json({message:'暂时无法保存或读取，请稍后重试'},502);}
}
