import 'server-only';
import { cookies } from 'next/headers';
import { requirePortalSession } from '../../_lib/portal-access';
import { sessionCookieNameForPortal } from '../../_lib/session-cookie';
import type { OwnerGarage, OwnerVehicle } from './garage';

const apiBase=process.env.ALSVID_API_BASE_URL??'http://localhost:4000/api';

type OwnerVehicleRow={id:string;vehicle_code:string;frame_number:string;sku:string;born_at:string};
function present(row:OwnerVehicleRow):OwnerVehicle {
 // Purchase date, warranty period, color, delivery party and order context cannot be invented.
 return {
  id:row.id,model:row.sku,variant:'SKU '+row.sku,colorway:'颜色待核验',tone:'graphite',
  vin:'待登记',frameNumber:row.frame_number,purchaseDate:'待核验',deliveryDate:'待核验',
  dealer:'待核验',status:'normal',statusLabel:'所有权已核验 / 车辆状态未检测',
  warranty:{plan:'保修资格待核验',start:'',end:'',active:false,coverage:[]},
  services:[],repairs:[],documents:[],accessories:[],
 };
}
async function query<T>(path:string):Promise<T> {
 await requirePortalSession('my','/my');
 const token=(await cookies()).get(sessionCookieNameForPortal('my'))?.value;
 if(!token)throw new Error('Missing My ALSVID session');
 const response=await fetch(apiBase+path,{headers:{authorization:'Bearer '+token},cache:'no-store'});
 if(response.status===404)throw new Error('Owner vehicle not found');
 if(!response.ok)throw new Error('无法读取已核验的车库记录，请检查 My ALSVID 登录与所有权关联状态');
 const json=await response.json() as {data:T};
 if(!json||!('data' in json))throw new Error('Invalid My ALSVID garage response');
 return json.data;
}
export async function getOwnerGarage():Promise<OwnerGarage>{
 const session=await requirePortalSession('my','/my');
 const rows=await query<OwnerVehicleRow[]>('/v1/my/garage');
 if(!Array.isArray(rows))throw new Error('Invalid owned-vehicle list');
 return {ownerName:session.displayName,updatedAt:new Date().toISOString(),vehicles:rows.map(present)};
}
export async function getVehicle(vehicleId:string):Promise<OwnerVehicle|null>{
 // Any unknown/mismatched vehicle returns null: no cross-user object details.
 const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!valid.test(vehicleId))return null;
 await requirePortalSession('my','/my/vehicles/'+vehicleId);
 const token=(await cookies()).get(sessionCookieNameForPortal('my'))?.value;
 if(!token)throw new Error('Missing My ALSVID session');
 const r=await fetch(apiBase+'/v1/my/garage/'+encodeURIComponent(vehicleId),{headers:{authorization:'Bearer '+token},cache:'no-store'});
 if(r.status===404)return null;
 if(!r.ok)throw new Error('无法读取这台车；车辆权限或会话可能已经改变');
 const p=await r.json() as {data:OwnerVehicleRow};
 return p.data?present(p.data):null;
}
