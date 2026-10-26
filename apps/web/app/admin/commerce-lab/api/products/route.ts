import { comparisonAdminProxy } from '../../../../_experiments/commerce-lab/admin-proxy.server';
export const dynamic='force-dynamic';
export async function GET(request:Request){return comparisonAdminProxy(request,'GET');}
export async function POST(request:Request){return comparisonAdminProxy(request,'POST');}
