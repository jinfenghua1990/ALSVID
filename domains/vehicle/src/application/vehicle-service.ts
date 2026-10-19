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
 async birth(actor:VehicleActor,unitId:string,frameNumberInput:string):Promise<any>{requireCapability(actor,VehicleCapability.Birth);const frameNumber=normalizeFrameNumber(frameNumberInput);try{return await this.repository.transaction(async executor=>{const unit=await this.repository.lockBirthCandidate(unitId,executor);if(!unit)throw new VehicleNotFoundError('Production unit not found');if(unit.status!=='QC_PASSED')throw new VehicleConflictError('Vehicle birth requires QC_PASSED production unit');const qc=await this.repository.latestQc(unitId,executor);if(!qc||qc.result!=='PASS')throw new VehicleConflictError('Latest QC inspection must be PASS');const created=await this.repository.createVehicle({frameNumber,unitId,productionOrderId:unit.production_order_id,buildSpecId:unit.build_spec_id,skuId:unit.sku_id,factoryPartnerId:unit.factory_partner_id,birthQcInspectionId:qc.id,actorUserId:actor.userId},executor);await this.audit.record({actorUserId:actor.userId,action:'vehicle.born',targetType:'vehicle',targetId:created.id,metadata:{frameNumber,productionUnitId:unitId}},executor);return created})}catch(error){if(error instanceof VehicleNotFoundError||error instanceof VehicleConflictError||error instanceof VehicleValidationError)throw error;if(postgresErrorCode(error)==='23505')throw new VehicleConflictError('Frame number or production unit already has a Vehicle identity');const message=error instanceof Error?error.message:'';if(message.includes('Vehicle birth'))throw new VehicleConflictError(message);throw error}}
}
function requireCapability(actor:VehicleActor,capability:string):void{if(!actor.permissions.includes(capability))throw new ForbiddenError('VEHICLE_FORBIDDEN',`Missing permission: ${capability}`)}
