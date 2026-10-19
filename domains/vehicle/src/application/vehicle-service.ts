import{postgresErrorCode}from'@alsvid/database';import{ForbiddenError}from'@alsvid/kernel';import{VehicleCapability}from'../core/model.js';import{VehicleConflictError,VehicleNotFoundError,VehicleValidationError}from'../core/errors.js';import{normalizeFrameNumber}from'../core/normalization.js';import type{VehicleActor,VehicleAuditPort,VehicleRepository}from'./ports.js';
export class VehicleService{constructor(private readonly repository:VehicleRepository,private readonly audit:VehicleAuditPort){}
 async list(actor:VehicleActor):Promise<any[]>{requireCapability(actor,VehicleCapability.Read);return this.repository.list()}
 async get(actor:VehicleActor,id:string):Promise<any>{
  requireCapability(actor,VehicleCapability.Read);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
   throw new VehicleValidationError('Valid vehicle ID is required');
  const result=await this.repository.get(id);
  if(!result)throw new VehicleNotFoundError('Vehicle not found');
  return result;
 }
 async ownedGarage(actor:VehicleActor):Promise<any[]>{
  if(!actor.roles?.includes('customer_user'))throw new ForbiddenError('MY_OWNER_FORBIDDEN','Customer account role required');
  return this.repository.listOwned(actor.userId);
 }
 async ownedVehicle(actor:VehicleActor,vehicleId:string):Promise<any>{
  if(!actor.roles?.includes('customer_user'))throw new ForbiddenError('MY_OWNER_FORBIDDEN','Customer account role required');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vehicleId))
   throw new VehicleValidationError('Valid Vehicle UUID required');
  const vehicle=await this.repository.getOwned(actor.userId,vehicleId);
  if(!vehicle)throw new VehicleNotFoundError('Owned vehicle not found');
  return vehicle;
 }
 async grantOwnerAccess(actor:VehicleActor,vehicleId:string,customerUserId:string,evidenceRef:string):Promise<{vehicleId:string;customerUserId:string;status:'GRANTED'}>{
  requireOwnerManager(actor);
  assertUuid(vehicleId);assertUuid(customerUserId);
  const evidence=validateHandoverEvidence(evidenceRef);
  return this.repository.transaction(async e=>{
   if(!await this.repository.lockForOwnerChange(vehicleId,e))throw new VehicleNotFoundError('Vehicle not found');
   if(!await this.repository.eligibleOwner(customerUserId,e))throw new VehicleConflictError('Target must be an active email-verified customer user');
   const latest=await this.repository.latestOwner(vehicleId,e);
   if(latest?.kind==='GRANTED')throw new VehicleConflictError('Active owner already exists; revoke first using verified transfer evidence');
   await this.repository.recordOwnerEvent(vehicleId,customerUserId,'GRANTED',evidence,actor.userId,e);
   await this.audit.record({actorUserId:actor.userId,action:'vehicle.owner_access_granted',
    targetType:'vehicle',targetId:vehicleId,metadata:{customerUserId,evidenceRef:evidence}},e);
   return {vehicleId,customerUserId,status:'GRANTED'};
  });
 }
 async revokeOwnerAccess(actor:VehicleActor,vehicleId:string,evidenceRef:string):Promise<{vehicleId:string;status:'REVOKED'}>{
  requireOwnerManager(actor);assertUuid(vehicleId);
  const evidence=validateHandoverEvidence(evidenceRef);
  return this.repository.transaction(async e=>{
   if(!await this.repository.lockForOwnerChange(vehicleId,e))throw new VehicleNotFoundError('Vehicle not found');
   const latest=await this.repository.latestOwner(vehicleId,e);
   if(!latest||latest.kind!=='GRANTED')throw new VehicleConflictError('No active owner access to revoke');
   await this.repository.recordOwnerEvent(vehicleId,latest.customerUserId,'REVOKED',evidence,actor.userId,e);
   await this.audit.record({actorUserId:actor.userId,action:'vehicle.owner_access_revoked',
    targetType:'vehicle',targetId:vehicleId,metadata:{customerUserId:latest.customerUserId,evidenceRef:evidence}},e);
   return {vehicleId,status:'REVOKED'};
  });
 }
 async birth(actor:VehicleActor,unitId:string,frameNumberInput:string):Promise<any>{requireCapability(actor,VehicleCapability.Birth);const frameNumber=normalizeFrameNumber(frameNumberInput);try{return await this.repository.transaction(async executor=>{const unit=await this.repository.lockBirthCandidate(unitId,executor);if(!unit)throw new VehicleNotFoundError('Production unit not found');if(unit.status!=='QC_PASSED')throw new VehicleConflictError('Vehicle birth requires QC_PASSED production unit');const qc=await this.repository.latestQc(unitId,executor);if(!qc||qc.result!=='PASS')throw new VehicleConflictError('Latest QC inspection must be PASS');const created=await this.repository.createVehicle({frameNumber,unitId,productionOrderId:unit.production_order_id,buildSpecId:unit.build_spec_id,skuId:unit.sku_id,factoryPartnerId:unit.factory_partner_id,birthQcInspectionId:qc.id,actorUserId:actor.userId},executor);await this.audit.record({actorUserId:actor.userId,action:'vehicle.born',targetType:'vehicle',targetId:created.id,metadata:{frameNumber,productionUnitId:unitId}},executor);return created})}catch(error){if(error instanceof VehicleNotFoundError||error instanceof VehicleConflictError||error instanceof VehicleValidationError)throw error;if(postgresErrorCode(error)==='23505')throw new VehicleConflictError('Frame number or production unit already has a Vehicle identity');const message=error instanceof Error?error.message:'';if(message.includes('Vehicle birth'))throw new VehicleConflictError(message);throw error}}
}
function requireCapability(actor:VehicleActor,capability:string):void{if(!actor.permissions.includes(capability))throw new ForbiddenError('VEHICLE_FORBIDDEN',`Missing permission: ${capability}`)}

function assertUuid(value:string):void {
 if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
  throw new VehicleValidationError('Valid UUID required');
}
function validateHandoverEvidence(value:unknown):string {
 const evidence=typeof value==='string'?value.trim():'';
 if(evidence.length<12||evidence.length>200)throw new VehicleValidationError('A reviewed delivery/ownership evidence reference (12-200 chars) is required');
 return evidence;
}
function requireOwnerManager(actor:VehicleActor):void {
 if(!actor.roles?.includes('system_admin')||!actor.permissions.includes('vehicle.owner.manage'))
  throw new ForbiddenError('VEHICLE_OWNER_FORBIDDEN','Verified owner handover requires internal administrator permission');
}
