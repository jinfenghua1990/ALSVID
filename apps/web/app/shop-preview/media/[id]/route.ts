import {publicComparisonImage} from '../../../_experiments/commerce-lab/image-proxy.server';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return publicComparisonImage((await params).id);}
