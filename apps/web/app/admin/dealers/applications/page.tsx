import { backendFetch } from '../../../api/_lib/backend';
import { DealerApplicationsAdmin } from '../../../_components/public-network/dealer-applications-admin';

export const metadata={title:'经销商合作申请 · ALSVID Admin'};
export const dynamic='force-dynamic';
type Application={
 id:string;companyName:string;contactName:string;email:string;country:string;
 partnershipType:string;website:string|null;message:string|null;
 locale:string;status:string;submittedAt:string;
};
export default async function DealerApplicationsPage(){
 let data:Application[]=[];
 let available=false;
 try{
  const response=await backendFetch('/v1/dealer-applications');
  if(response.ok){
   const body=await response.json() as {data?:Application[]};
   if(Array.isArray(body.data)){data=body.data;available=true;}
  }
 }catch{/* Error state is rendered instead of inventing an empty database. */}
 return <DealerApplicationsAdmin initial={data} available={available}/>;
}
