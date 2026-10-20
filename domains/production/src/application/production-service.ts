import{postgresErrorCode,type QueryExecutor}from'@alsvid/database';import{ForbiddenError}from'@alsvid/kernel';
import{ProductionCapability,type CreateProductionOrderInput,type ProductionDeviationInput,type ProductionSummary,type QcInspectionInput}from'../core/model.js';import{ProductionConflictError,ProductionNotFoundError,ProductionValidationError}from'../core/errors.js';import{assertQcResult,positiveProductionDecimal,positiveProductionInteger}from'../core/validation.js';import type{ProductionActor,ProductionAuditPort,ProductionRepository}from'./ports.js';
export class ProductionService{
 constructor(private readonly repository:ProductionRepository,private readonly audit:ProductionAuditPort){}
 async summary(actor:ProductionActor):Promise<ProductionSummary>{requireCapability(actor,ProductionCapability.Read);return this.repository.summary()}
 async createOrder(actor:ProductionActor,input:CreateProductionOrderInput):Promise<any>{requireCapability(actor,ProductionCapability.Write);positiveProductionInteger(input.plannedQuantity,'plannedQuantity');if(!input.buildSpecId||!input.factoryPartnerId)throw new ProductionValidationError('buildSpecId and factoryPartnerId are required');if(input.sourceStorefrontOrderLineId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.sourceStorefrontOrderLineId))throw new ProductionValidationError('sourceStorefrontOrderLineId must be a valid UUID');try{const row=await this.repository.createOrder({...input,actorUserId:actor.userId});await this.audit.record({actorUserId:actor.userId,action:'production.order_created',targetType:'production.order',targetId:row.id});return row}catch(error){const message=error instanceof Error?error.message:'';if(message.includes('released Build Specification'))throw new ProductionValidationError('Production Order requires a released Build Specification');if(message.includes('FACTORY Partner role'))throw new ProductionValidationError('Selected Partner is not a Factory');if(message.includes('source purchase order'))throw new ProductionValidationError(message);if(message.includes('storefront order')||message.includes('Production demand')||message.includes('Verified PSP evidence')||message.includes('Production quantity must match'))throw new ProductionValidationError(message);if(postgresErrorCode(error)==='23503')throw new ProductionNotFoundError('Build Specification, Factory or source PO not found');throw error}}
 async createFromStorefrontOrder(actor:ProductionActor,orderId:string,factoryPartnerId:string):Promise<any[]>{
  requireCapability(actor,ProductionCapability.Write);
  if(!actor.permissions.includes('commerce.storefront.production'))throw new ForbiddenError('PRODUCTION_FORBIDDEN','Missing permission: commerce.storefront.production');
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(!uuid.test(orderId)||!uuid.test(factoryPartnerId))throw new ProductionValidationError('A valid storefront order ID and factory Partner ID are required');
  return this.repository.transaction(async(executor:QueryExecutor)=>{
   const found=await executor.query<any>(`SELECT id,order_number,status,payment_status,tax_configuration_status,total_gross_amount::text,currency
    FROM commerce.storefront_orders WHERE id=$1 FOR UPDATE`,[orderId]);
   const order=found.rows[0];
   if(!order)throw new ProductionNotFoundError('First-party storefront order not found');
   if(!['PAYMENT_VERIFIED','FULFILLMENT_PENDING','IN_PRODUCTION'].includes(order.status)
     ||order.payment_status!=='VERIFIED'||order.tax_configuration_status!=='VERIFIED'){
    throw new ProductionConflictError('Production demand requires a PSP-verified order and approved tax configuration; draft or unverified orders are blocked');
   }
   const evidence=await executor.query(`SELECT id FROM commerce.storefront_payment_verifications
    WHERE order_id=$1 AND amount=$2 AND currency=$3 AND provider_status='SUCCEEDED'
      AND signature_verified_at IS NOT NULL AND order_binding_verified_at IS NOT NULL LIMIT 1`,
    [orderId,order.total_gross_amount,order.currency]);
   if(!evidence.rows[0])throw new ProductionConflictError('Matching signed PSP payment evidence is required before creating production demand');
   const factory=await executor.query(`SELECT p.id FROM partners.partners p
    JOIN partners.roles r ON r.partner_id=p.id WHERE p.id=$1 AND r.role='FACTORY' LIMIT 1`,[factoryPartnerId]);
   if(!factory.rows[0])throw new ProductionValidationError('Selected Partner is not a Factory');
   const lines=await executor.query<any>(`SELECT l.id AS line_id,l.sku_id,l.quantity,
     bs.id AS build_spec_id
    FROM commerce.storefront_order_lines l
    LEFT JOIN LATERAL(
     SELECT x.id FROM engineering.build_specs x WHERE x.sku_id=l.sku_id AND x.status='RELEASED'
     ORDER BY x.effective_from DESC NULLS LAST,x.released_at DESC NULLS LAST,x.created_at DESC LIMIT 1
    ) bs ON TRUE
    WHERE l.order_id=$1 ORDER BY l.created_at,l.id FOR SHARE OF l`,[orderId]);
   if(!lines.rows.length)throw new ProductionValidationError('First-party order has no immutable order lines');
   const missing=lines.rows.find((line:any)=>!line.build_spec_id);
   if(missing)throw new ProductionConflictError('No released Build Specification matches storefront SKU '+missing.sku_id);
   const lineIds=lines.rows.map((line:any)=>line.line_id);
   const existing=await executor.query<any>(`SELECT id,production_order_number,source_storefront_order_line_id,
     planned_quantity,build_spec_id,factory_partner_id,status
    FROM production.production_orders WHERE source_storefront_order_line_id=ANY($1::uuid[])
    ORDER BY created_at,id`,[lineIds]);
   if(existing.rows.length&&existing.rows.length!==lines.rows.length)
    throw new ProductionConflictError('Partial production demand already exists; reconcile linked production orders before retrying');
   if(existing.rows.length===lines.rows.length){
    if(existing.rows.some((row:any)=>row.factory_partner_id!==factoryPartnerId))
     throw new ProductionConflictError('Production demand already exists for a different Factory; do not create duplicates');
    if(order.status==='PAYMENT_VERIFIED'){
     await executor.query(`UPDATE commerce.storefront_orders SET status='FULFILLMENT_PENDING',
      version=version+1,updated_by=$2,updated_at=now() WHERE id=$1 AND status='PAYMENT_VERIFIED'`,[orderId,actor.userId]);
     await this.audit.record({actorUserId:actor.userId,action:'commerce.storefront_order_ready_for_fulfillment',
      targetType:'commerce.storefront_order',targetId:orderId,metadata:{orderNumber:order.order_number}},executor);
    }
    return existing.rows;
   }
   if(order.status==='IN_PRODUCTION')throw new ProductionConflictError('Order is marked in production but its linked production orders are missing');
   if(order.status==='PAYMENT_VERIFIED'){
    const advanced=await executor.query(`UPDATE commerce.storefront_orders SET status='FULFILLMENT_PENDING',
     version=version+1,updated_by=$2,updated_at=now() WHERE id=$1 AND status='PAYMENT_VERIFIED' RETURNING id`,[orderId,actor.userId]);
    if(!advanced.rows[0])throw new ProductionConflictError('Storefront order state changed; reload and retry');
    await this.audit.record({actorUserId:actor.userId,action:'commerce.storefront_order_ready_for_fulfillment',
     targetType:'commerce.storefront_order',targetId:orderId,metadata:{orderNumber:order.order_number}},executor);
   }
   const created:any[]=[];
   for(const line of lines.rows){
    const row=await this.repository.createOrder({
     buildSpecId:line.build_spec_id,factoryPartnerId,plannedQuantity:Number(line.quantity),
     sourceStorefrontOrderLineId:line.line_id,
     note:`ALSVID storefront ${order.order_number}; sales line ${line.line_id}`,
     actorUserId:actor.userId,
    },executor);
    created.push(row);
    await this.audit.record({actorUserId:actor.userId,action:'production.order_created_from_storefront',
     targetType:'production.order',targetId:row.id,
     metadata:{orderId,orderNumber:order.order_number,orderLineId:line.line_id,skuId:line.sku_id,
      plannedQuantity:Number(line.quantity),buildSpecId:line.build_spec_id,factoryPartnerId}},executor);
   }
   return created;
  });
 }
 async releaseOrder(actor:ProductionActor,orderId:string):Promise<any>{requireCapability(actor,ProductionCapability.Release);return this.repository.transaction(async executor=>{const row=await this.repository.releaseOrder(orderId,actor.userId,executor);if(!row)throw new ProductionConflictError('Production Order is missing or no longer draft');await this.repository.createUnits(orderId,row.planned_quantity,actor.userId,executor);await this.audit.record({actorUserId:actor.userId,action:'production.order_released',targetType:'production.order',targetId:orderId,metadata:{plannedQuantity:row.planned_quantity}},executor);return row})}
 async startOrder(actor:ProductionActor,orderId:string):Promise<any>{requireCapability(actor,ProductionCapability.Write);const row=await this.repository.startOrder(orderId,actor.userId);if(!row)throw new ProductionConflictError('Only released Production Orders can start');await this.audit.record({actorUserId:actor.userId,action:'production.order_started',targetType:'production.order',targetId:orderId});return row}
 async markUnitAssembled(actor:ProductionActor,unitId:string):Promise<any>{requireCapability(actor,ProductionCapability.Write);const row=await this.repository.markUnitAssembled(unitId,actor.userId);if(!row)throw new ProductionConflictError('Unit must belong to an in-progress order and not already be assembled');await this.audit.record({actorUserId:actor.userId,action:'production.unit_assembled',targetType:'production.unit',targetId:unitId});return row}
 async moveOrderToQc(actor:ProductionActor,orderId:string):Promise<any>{requireCapability(actor,ProductionCapability.Write);return this.repository.transaction(async executor=>{if(await this.repository.countUnitsBlockingQc(orderId,executor)!==0)throw new ProductionConflictError('All production units must be assembled before QC');const row=await this.repository.moveOrderToQc(orderId,actor.userId,executor);if(!row)throw new ProductionConflictError('Only in-progress Production Orders can enter QC');await this.repository.markAssembledUnitsQcPending(orderId,actor.userId,executor);await this.audit.record({actorUserId:actor.userId,action:'production.order_qc_pending',targetType:'production.order',targetId:orderId},executor);return row})}
 async inspectUnit(actor:ProductionActor,unitId:string,input:QcInspectionInput):Promise<any>{requireCapability(actor,ProductionCapability.QcInspect);assertQcResult(input.result);return this.repository.transaction(async executor=>{const unit=await this.repository.lockUnit(unitId,executor);if(!unit)throw new ProductionNotFoundError('Production unit not found');if(unit.order_status!=='QC_PENDING')throw new ProductionConflictError('Production Order must be QC_PENDING');if(['QC_FAILED','HOLD','ASSEMBLED'].includes(unit.status))await this.repository.setUnitStatus(unitId,'QC_PENDING',actor.userId,executor);const inspection=await this.repository.createInspection(unitId,input,actor.userId,executor);const next=input.result==='PASS'?'QC_PASSED':input.result==='FAIL'?'QC_FAILED':'HOLD';await this.repository.setUnitStatus(unitId,next,actor.userId,executor);await this.audit.record({actorUserId:actor.userId,action:'production.qc_inspected',targetType:'production.unit',targetId:unitId,metadata:{inspectionId:inspection.id,result:input.result}},executor);return inspection})}
 async recordDeviation(actor:ProductionActor,unitId:string,input:ProductionDeviationInput):Promise<any>{requireCapability(actor,ProductionCapability.Write);if(!input.reason?.trim())throw new ProductionValidationError('Deviation reason is required');const row=await this.repository.recordDeviation(unitId,{...input,quantity:positiveProductionDecimal(input.quantity,'quantity')},actor.userId);await this.audit.record({actorUserId:actor.userId,action:'production.deviation_recorded',targetType:'production.unit',targetId:unitId,metadata:{deviationId:row.id}});return row}
 async completeOrder(actor:ProductionActor,orderId:string):Promise<any>{requireCapability(actor,ProductionCapability.Release);if(await this.repository.countUnitsNotQcPassed(orderId)!==0)throw new ProductionConflictError('Every production unit must be QC_PASSED before completion');const row=await this.repository.completeOrder(orderId,actor.userId);if(!row)throw new ProductionConflictError('Only QC-pending Production Orders can complete');await this.audit.record({actorUserId:actor.userId,action:'production.order_completed',targetType:'production.order',targetId:orderId});return row}
}
function requireCapability(actor:ProductionActor,capability:string):void{if(!actor.permissions.includes(capability))throw new ForbiddenError('PRODUCTION_FORBIDDEN',`Missing permission: ${capability}`)}
