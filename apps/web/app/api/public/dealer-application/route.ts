import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
 const origin=request.headers.get('origin');
 if (origin) {
  try {
   if (new URL(origin).origin !== new URL(request.url).origin)
    return NextResponse.json({error:'Origin not allowed'},{status:403});
  } catch {return NextResponse.json({error:'Invalid origin'},{status:400});}
 }
 if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
  return NextResponse.json({error:'Expected JSON'},{status:415});
 if (Number(request.headers.get('content-length')??'0')>4096)
  return NextResponse.json({error:'Request too large'},{status:413});
 const raw=await request.text().catch(()=>null);
 if(raw===null||raw.length>4096)return NextResponse.json({error:'Request too large'},{status:413});
 let body:unknown;
 try {body=JSON.parse(raw);} catch {return NextResponse.json({error:'Invalid JSON'},{status:400});}
 if(!body || typeof body!=='object' || Array.isArray(body))
  return NextResponse.json({error:'Invalid application'},{status:400});
 const apiBase=process.env.ALSVID_API_BASE_URL;
 if(!apiBase)return NextResponse.json({error:'Application service not configured'},{status:503});
 try {
  const response=await fetch(apiBase+'/v1/public/dealer-applications',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store',
   signal:AbortSignal.timeout(10000),
  });
  const payload=await response.json().catch(()=>({error:'Application service unavailable'}));
  return NextResponse.json(payload,{status:response.status,headers:{'cache-control':'no-store'}});
 } catch {
  return NextResponse.json({error:'Application service unavailable'},{status:503});
 }
}
