import { backendFetch } from '../../../api/_lib/backend';
import { TestRideAdmin, type TestRideLead, type TestRidePartnerLocation } from '../../../_components/public-network/test-ride-admin';

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
 return <TestRideAdmin initialRequests={requests} initialLocations={locations}
  requestsAvailable={requestsAvailable} locationsAvailable={locationsAvailable}/>;
}
