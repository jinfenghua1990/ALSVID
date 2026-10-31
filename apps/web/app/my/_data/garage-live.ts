import 'server-only';
import { cookies } from 'next/headers';
import { requirePortalSession } from '../../_lib/portal-access';
import { sessionCookieNameForPortal } from '../../_lib/session-cookie';
import type { OwnerGarage, OwnerVehicle } from './garage';

const apiBase=process.env.ALSVID_API_BASE_URL??'';

type OwnerVehicleRow={id:string;vehicle_code:string;frame_number:string;sku:string;born_at:string};
type OwnerCaseRow={id:string;caseNumber:string;vehicleId:string;title:string;status:string;createdAt:string;updatedAt:string};
function present(row:OwnerVehicleRow,allCases:OwnerCaseRow[]):OwnerVehicle {
 const cases=allCases.filter(c=>c.vehicleId===row.id);
 const statusMap:Record<string,'open'|'processing'|'done'>={
  NEW:'open',TRIAGED:'open',IN_PROGRESS:'processing',RESOLVED:'processing',CLOSED:'done',
 };
 const labelMap:Record<string,string>={NEW:'待受理',TRIAGED:'已分诊',IN_PROGRESS:'处理中',RESOLVED:'已解决待确认',CLOSED:'已关闭'};
 const repairs=cases.map(c=>({id:c.id,code:c.caseNumber,issue:c.title,
  status:statusMap[c.status]??'open',statusLabel:labelMap[c.status]??'待核验',
  openedAt:c.createdAt.slice(0,10),completedAt:c.status==='CLOSED'?c.updatedAt.slice(0,10):null
 }));

 // Purchase date, warranty period, color, delivery party and order context cannot be invented.
 return {
  id:row.id,model:row.sku,variant:'SKU '+row.sku,colorway:'颜色待核验',tone:'graphite',
  vin:'待登记',frameNumber:row.frame_number,purchaseDate:'待核验',deliveryDate:'待核验',
  dealer:'待核验',status:'normal',statusLabel:'所有权已核验 / 车辆状态未检测',
  warranty:{plan:'保修资格待核验',start:'',end:'',active:false,coverage:[]},
  services:[],repairs,documents:[],accessories:[],
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
 const [rows,cases]=await Promise.all([query<OwnerVehicleRow[]>('/v1/my/garage'),query<OwnerCaseRow[]>('/v1/my/service/cases')]);
 if(!Array.isArray(rows)||!Array.isArray(cases))throw new Error('Invalid owned-vehicle/service data');
 return {ownerName:session.displayName,updatedAt:new Date().toISOString(),vehicles:rows.map(row=>present(row,cases))};
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
 if(!p.data)return null;
 const cases=await query<OwnerCaseRow[]>('/v1/my/service/cases');
 return present(p.data,cases);
}
