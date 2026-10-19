import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryExecutor } from '@alsvid/database';
import { VehicleService } from './application/vehicle-service.js';
import type { VehicleRepository } from './application/ports.js';

const vehicleId='22222222-2222-4222-8222-222222222222';
const ownerId='33333333-3333-4333-8333-333333333333';
const outsiderId='44444444-4444-4444-8444-444444444444';
const admin={userId:'11111111-1111-4111-8111-111111111111',roles:['system_admin'],
 permissions:['vehicle.owner.manage','vehicle.read']};
function fixture(){
 let current:{customerUserId:string;kind:string}|null=null;
 const events:string[]=[];const auditEvents:string[]=[];
 const sample={id:vehicleId,frame_number:'FC1-2026-0001',sku:'FC1'};
 const repository={
  transaction:<T>(fn:(executor:QueryExecutor)=>Promise<T>)=>fn({} as QueryExecutor),
  listOwned:async(userId:string)=>current?.kind==='GRANTED'&&current.customerUserId===userId?[sample]:[],
  getOwned:async(userId:string,id:string)=>current?.kind==='GRANTED'&&current.customerUserId===userId&&id===vehicleId?sample:null,
  lockForOwnerChange:async(id:string)=>id===vehicleId,
  eligibleOwner:async(id:string)=>id===ownerId,
  latestOwner:async()=>current,
  recordOwnerEvent:async(_vehicleId:string,id:string,kind:string)=>{current={customerUserId:id,kind};events.push(kind);},
 } as unknown as VehicleRepository;
 const service=new VehicleService(repository,{record:async event=>{auditEvents.push(event.action);}});
 return {service,events,auditEvents};
}
test('owner lookup is separate from vehicle.read and never gives a second customer access',async()=>{
 const x=fixture();
 const real={userId:ownerId,roles:['customer_user'],permissions:[]};
 assert.deepEqual(await x.service.ownedGarage(real),[]);
 await x.service.grantOwnerAccess(admin,vehicleId,ownerId,'DELIVERY-REF-2026-001');
 assert.equal((await x.service.ownedGarage(real)).length,1);
 assert.equal((await x.service.ownedVehicle(real,vehicleId)).id,vehicleId);
 await assert.rejects(x.service.ownedVehicle({...real,userId:outsiderId},vehicleId),{code:'VEHICLE_NOT_FOUND'});
 await assert.rejects(x.service.ownedGarage({...real,roles:['dealer_user']}),{code:'MY_OWNER_FORBIDDEN'});
});
test('owner handover and revoke require internal administrator and immutable audit',async()=>{
 const x=fixture();
 await assert.rejects(x.service.grantOwnerAccess({...admin,roles:['dealer_user']},vehicleId,ownerId,'DELIVERY-REF-2026-001'),{code:'VEHICLE_OWNER_FORBIDDEN'});
 await assert.rejects(x.service.grantOwnerAccess(admin,vehicleId,outsiderId,'DELIVERY-REF-2026-001'),{code:'VEHICLE_CONFLICT'});
 await x.service.grantOwnerAccess(admin,vehicleId,ownerId,'DELIVERY-REF-2026-001');
 await assert.rejects(x.service.grantOwnerAccess(admin,vehicleId,ownerId,'DELIVERY-REF-2026-001'),{code:'VEHICLE_CONFLICT'});
 await x.service.revokeOwnerAccess(admin,vehicleId,'OWNER-TRANSFER-2026-01');
 assert.deepEqual(x.events,['GRANTED','REVOKED']);
 assert.deepEqual(x.auditEvents,['vehicle.owner_access_granted','vehicle.owner_access_revoked']);
 assert.deepEqual(await x.service.ownedGarage({userId:ownerId,roles:['customer_user'],permissions:[]}),[]);
});
