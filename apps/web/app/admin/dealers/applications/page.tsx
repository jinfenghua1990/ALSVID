import { backendFetch } from '../../../api/_lib/backend';
import { DealerApplicationsAdmin } from '../../../_components/public-network/dealer-applications-admin';
import AdminScreen from '../../../_design/renderer';
import { screenById } from '../../../_design';
import type { Screen } from '../../../_design';

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
 const screen: Screen = { ...screenById('dealers'), id: 'dealer-applications',
  route: '/admin/dealers/applications', title: '合作申请', sourceNode: undefined,
  blocks: [], actions: [] };
 return <AdminScreen screen={screen} hidePageHeading>
  <DealerApplicationsAdmin initial={data} available={available}/>
 </AdminScreen>;
}
