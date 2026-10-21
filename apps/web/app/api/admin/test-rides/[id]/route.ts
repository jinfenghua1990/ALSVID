import { NextResponse } from 'next/server';
import { backendFetch } from '../../../_lib/backend';
type Ctx={params:Promise<{id:string}>};
const UUID=/^[0-9a-f-]{36}$/i;
export async function PATCH(request:Request,{params}:Ctx):Promise<NextResponse>{
 const {id}=await params;
 if(!UUID.test(id))return NextResponse.json({error:'Invalid id'},{status:400});
 const origin=request.headers.get('origin');
 if(origin && origin!==new URL(request.url).origin)return NextResponse.json({error:'Origin rejected'},{status:403});
 const raw=await request.text();
 if(raw.length>400)return NextResponse.json({error:'Payload too large'},{status:413});
 let body:unknown;
 try{body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 if(!body||typeof body!=='object'||Array.isArray(body)||
   !('status' in body)||!['NEW','REVIEWING','CONTACTED','CLOSED'].includes(String(body.status))||
   !('locationId' in body)||(body.locationId!==null&&(typeof body.locationId!=='string'||!UUID.test(body.locationId))))
  return NextResponse.json({error:'Invalid update'},{status:400});
 try{
  const response=await backendFetch('/v1/test-rides/'+id,{method:'PATCH',body:JSON.stringify(body)});
  return NextResponse.json(await response.json(),{status:response.status});
 }catch{return NextResponse.json({error:'Service unavailable'},{status:503});}
}
