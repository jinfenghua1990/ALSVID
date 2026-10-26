import {comparisonImageProxy} from '../../../../../../_experiments/commerce-lab/image-proxy.server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){return comparisonImageProxy(request,(await params).id,'GET');}
export async function POST(request:Request,{params}:Context){return comparisonImageProxy(request,(await params).id,'POST');}
export async function DELETE(request:Request,{params}:Context){return comparisonImageProxy(request,(await params).id,'DELETE');}
