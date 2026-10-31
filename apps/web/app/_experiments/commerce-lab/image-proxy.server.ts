import 'server-only';
import {comparisonAdminAuthorization} from './admin-proxy.server';
const apiBase=process.env.ALSVID_API_BASE_URL??'';
const limit=5*1024*1024;
const types=new Set(['image/jpeg','image/png','image/webp']);
const validId=(id:string)=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
const error=(message:string,status:number)=>Response.json({message},{status,headers:{'cache-control':'no-store'}});
async function readBody(request:Request):Promise<ArrayBuffer|null>{
  if(Number(request.headers.get('content-length')??0)>limit)return null;
  const reader=request.body?.getReader();if(!reader)return new ArrayBuffer(0);
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return null;}chunks.push(value);}
  const output=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}return output.buffer;
}
async function redirectImage(response:Response):Promise<Response>{
  if(!response.headers.get('content-type')?.includes('application/json'))return error('图片暂时无法读取',502);
  const payload=await response.json();
  if(!response.ok)return Response.json(payload,{status:response.status,headers:{'cache-control':'no-store'}});
  const value=payload?.data?.url;
  if(typeof value!=='string')return error('图片地址无效',502);
  const target=new URL(value);
  if(target.protocol!=='https:'||target.username||target.password)return error('图片地址无效',502);
  return new Response(null,{status:307,headers:{location:target.toString(),'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
}
export async function comparisonImageProxy(request:Request,id:string,method:'GET'|'POST'|'DELETE'):Promise<Response>{
  const auth=await comparisonAdminAuthorization(request,method!=='GET');
  if('response' in auth)return auth.response;
  if(!validId(id))return error('商品 ID 无效',400);
  const headers:Record<string,string>={authorization:'Bearer '+auth.token};
  let body:ArrayBuffer|undefined;
  if(method==='POST'){
    const type=(request.headers.get('content-type')??'').split(';')[0]!.trim().toLowerCase();
    if(!types.has(type))return error('请选择 JPEG、PNG 或 WebP 图片',400);
    const bytes=await readBody(request);if(bytes===null)return error('图片不能超过 5 MiB',413);
    body=bytes;headers['content-type']=type;
    headers['x-upload-filename']=request.headers.get('x-upload-filename')??'';
  }
  if(method!=='GET')headers['x-product-version']=request.headers.get('x-product-version')??'';
  try{
    const response=await fetch(apiBase+'/v1/commerce-lab/products/'+id+'/image',{method,headers,...(body===undefined?{}:{body}),
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
    if(method==='GET')return await redirectImage(response);
    if(!response.headers.get('content-type')?.includes('application/json'))return error('暂时无法保存图片',502);
    return Response.json(await response.json(),{status:response.status,headers:{'cache-control':'no-store'}});
  }catch{return error('图片暂时无法读取或保存，请稍后重试',502);}
}
export async function publicComparisonImage(id:string):Promise<Response>{
  if(!validId(id))return error('Image not found',404);
  try{
    const response=await fetch(apiBase+'/v1/commerce-lab/public/products/'+id+'/image',
      {cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    return await redirectImage(response);
  }catch{return error('Image unavailable',502);}
}
