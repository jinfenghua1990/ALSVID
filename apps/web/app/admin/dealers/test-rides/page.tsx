import { backendFetch } from '../../../api/_lib/backend';
import { TestRideAdmin, type TestRideLead, type TestRidePartnerLocation } from '../../../_components/public-network/test-ride-admin';
import AdminScreen from '../../../_design/renderer';
import type { Screen } from '../../../_design';

export const metadata={title:'试骑申请与网点 · ALSVID Admin'};
export const dynamic='force-dynamic';
export default async function TestRideAdminPage() {
 let requests:TestRideLead[]=[];
 let locations:TestRidePartnerLocation[]=[];
 let requestsAvailable=false;
 let locationsAvailable=false;
 try{
  const response=await backendFetch('/v1/test-rides');
  if(response.ok){const payload=await response.json() as {data?:TestRideLead[]};
   if(Array.isArray(payload.data)){requests=payload.data;requestsAvailable=true;}
  }
 }catch{/* Show unavailable, never pretend no applications exist. */}
 try{
  const response=await backendFetch('/v1/test-rides/locations');
  if(response.ok){const payload=await response.json() as {data?:unknown[]};
   if(Array.isArray(payload.data)){locations=payload.data as TestRidePartnerLocation[];locationsAvailable=true;}
  }
 }catch{/* Show unavailable, never fabricate partner locations. */}
 const screen: Screen = { id: 'dealer-test-rides', area: '经销商',
  route: '/admin/dealers/test-rides', title: '试骑与合作网点',
  subtitle: '试骑申请与授权合作网点', blocks: [], actions: [] };
 return <AdminScreen screen={screen} hidePageHeading>
  <TestRideAdmin initialRequests={requests} initialLocations={locations}
    requestsAvailable={requestsAvailable} locationsAvailable={locationsAvailable}/>
 </AdminScreen>;
}
