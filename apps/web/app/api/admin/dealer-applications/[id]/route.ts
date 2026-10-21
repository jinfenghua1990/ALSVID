import { NextResponse } from 'next/server';
import { backendFetch } from '../../../_lib/backend';

type Ctx={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Ctx):Promise<NextResponse> {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Invalid id'},{status:400});
 const raw=await request.text();
 if(raw.length>200)return NextResponse.json({error:'Invalid body'},{status:413});
 let data:unknown;
 try{data=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
 if(!data||typeof data!=='object'||!('status' in data)||
  !['NEW','REVIEWING','CONTACTED','CLOSED'].includes(String(data.status)))
  return NextResponse.json({error:'Invalid status'},{status:400});
 try{
  const response=await backendFetch('/v1/dealer-applications/'+id+'/status',{method:'PATCH',body:JSON.stringify(data)});
  return NextResponse.json(await response.json(),{status:response.status});
 }catch{return NextResponse.json({error:'Service unavailable'},{status:503});}
}
