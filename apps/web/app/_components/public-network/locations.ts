/** Public-only projection: raw Partner contacts/roles are never sent to WWW. */
export type PublicCapability = 'sales' | 'service';
export type PublicLocation = {
 id:string;name:string;country:'DE'|'AT';city:string;address:string;sales:boolean;service:boolean;
};
export type PublicLocationsResult={locations:readonly PublicLocation[];available:boolean};

/** The API itself checks authorization and explicit publication approval. */
export async function publishedLocations(capability:PublicCapability):Promise<PublicLocationsResult> {
 const base=process.env.ALSVID_API_BASE_URL;
 if(!base)return {locations:[],available:false};
 try {
  const response=await fetch(base+'/v1/public/dealer-locations?capability='+capability,{
   cache:'no-store',signal:AbortSignal.timeout(8000),
  });
  if(!response.ok)return {locations:[],available:false};
  const json:unknown=await response.json();
  if(!json || typeof json!=='object'||!('data' in json)||!Array.isArray(json.data))
   return {locations:[],available:false};
  const rows=json.data.filter((value:unknown):value is PublicLocation=>{
   if(!value||typeof value!=='object')return false;
   const v=value as Record<string,unknown>;
   return typeof v.id==='string'&&typeof v.name==='string'&&
    (v.country==='DE'||v.country==='AT')&&typeof v.city==='string'&&
    typeof v.address==='string'&&typeof v.sales==='boolean'&&typeof v.service==='boolean';
  });
  return {locations:rows.filter(x=>capability==='sales'?x.sales:x.service),available:true};
 } catch {return {locations:[],available:false};}
}
