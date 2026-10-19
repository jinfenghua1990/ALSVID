import { ForbiddenError } from '@alsvid/kernel';
import { ProcurementConflictError, ProcurementNotFoundError, ProcurementValidationError } from '../core/errors.js';
import type { QueryExecutor } from '@alsvid/database';

export interface SupplierPortalActor { userId:string;roles:readonly string[];permissions:readonly string[] }
export interface SupplierAckLine {
 purchaseOrderLineId:string;
 confirmedQuantity:string;
 confirmedDate?:string;
}
export interface SupplierAcknowledgement {
 clientRequestId:string;expectedVersion:number;note:string;lines:SupplierAckLine[];
}
export interface SupplierPortalOrder {
 id:string;poNumber:string;status:string;version:number;currency:string;issuedAt:string|null;
 supplierName:string;lines:Array<{id:string;lineNo:number;description:string;orderedQuantity:string;unit:string;requestedDate:string|null}>;
}
export interface SupplierPortalRepository {
 transaction<T>(f:(executor:QueryExecutor)=>Promise<T>):Promise<T>;
 list(userId:string):Promise<SupplierPortalOrder[]>;
 order(userId:string,id:string,e?:QueryExecutor,lock?:boolean):Promise<SupplierPortalOrder|null>;
 acknowledgement(poId:string,requestId:string,e:QueryExecutor):Promise<{payload:unknown;recordId:string}|null>;
 confirm(po:SupplierPortalOrder,userId:string,input:SupplierAcknowledgement,payload:Record<string,unknown>,e:QueryExecutor):Promise<{id:string;poId:string;status:string}>;
}
export interface SupplierPortalAuditPort {
 record(input:{actorUserId:string;action:string;targetType:string;targetId:string;metadata?:Record<string,unknown>},executor?:QueryExecutor):Promise<void>;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireSupplier(actor:SupplierPortalActor,permission:string){
 if(!actor.roles.includes('supplier_user')||!actor.permissions.includes(permission))
  throw new ForbiddenError('SUPPLIER_SCOPE_FORBIDDEN','Supplier membership and permission required');
}
function id(value:unknown){
 if(typeof value!=='string'||!uuid.test(value))throw new ProcurementValidationError('Valid record UUID required');
 return value;
}
function normalizedAck(input:SupplierAcknowledgement,po:SupplierPortalOrder){
 if(!input||typeof input!=='object')throw new ProcurementValidationError('Confirmation data required');
 const clientRequestId=id(input.clientRequestId);
 if(!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw new ProcurementValidationError('Expected PO version required');
 const note=typeof input.note==='string'?input.note.trim():'';
 if(note.length<5||note.length>1000)throw new ProcurementValidationError('Confirmation note must be 5-1000 characters');
 if(!Array.isArray(input.lines)||input.lines.length!==po.lines.length||input.lines.length===0)
  throw new ProcurementValidationError('Confirmation must cover all PO lines; partial changes require a proposal');
 const expected=new Map(po.lines.map(l=>[l.id,l]));
 const seen=new Set<string>();
 const lines=input.lines.map(l=>{
  const lineId=id(l?.purchaseOrderLineId);
  const row=expected.get(lineId);
  if(!row||seen.has(lineId))throw new ProcurementValidationError('Lines must match only this purchase order and cannot repeat');
  seen.add(lineId);
  // For this slice, supplier acceptance cannot silently change quantities/prices.
  const qty=String(l.confirmedQuantity);
  if(!/^\d+(?:\.\d{1,6})?$/.test(qty)||Number(qty)<=0||Number(qty)!==Number(row.orderedQuantity))
   throw new ProcurementValidationError('Acknowledgement quantities must equal approved purchase order quantities');
  const confirmedDate=typeof l.confirmedDate==='string'&&l.confirmedDate.trim()?l.confirmedDate.trim():null;
  if(confirmedDate&&!/^\d{4}-\d{2}-\d{2}$/.test(confirmedDate))
   throw new ProcurementValidationError('Confirmed date must be YYYY-MM-DD');
  return {purchaseOrderLineId:lineId,confirmedQuantity:row.orderedQuantity,confirmedDate};
 }).sort((a,b)=>a.purchaseOrderLineId.localeCompare(b.purchaseOrderLineId));
 return {clientRequestId,expectedVersion:input.expectedVersion,note,lines};
}
export class SupplierPortalService {
 constructor(private readonly repo:SupplierPortalRepository,private readonly audit:SupplierPortalAuditPort){}
 async list(actor:SupplierPortalActor){
  requireSupplier(actor,'supplier.po.read');
  return this.repo.list(actor.userId);
 }
 async detail(actor:SupplierPortalActor,poId:string){
  requireSupplier(actor,'supplier.po.read');
  const record=await this.repo.order(actor.userId,id(poId));
  if(!record)throw new ProcurementNotFoundError('No accessible purchase order');
  return record;
 }
 async acknowledge(actor:SupplierPortalActor,poId:string,input:SupplierAcknowledgement){
  requireSupplier(actor,'supplier.po.ack');
  const target=id(poId);
  return this.repo.transaction(async e=>{
   const po=await this.repo.order(actor.userId,target,e,true);
   if(!po)throw new ProcurementNotFoundError('No accessible purchase order');
   const payload=normalizedAck(input,po);
   const earlier=await this.repo.acknowledgement(po.id,payload.clientRequestId,e);
   if(earlier){
    if(JSON.stringify(earlier.payload)!==JSON.stringify(payload))throw new ProcurementConflictError('Request ID belongs to another confirmation');
    return {id:earlier.recordId,poId:po.id,status:'CONFIRMED' as const};
   }
   if(po.status!=='ISSUED'||po.version!==payload.expectedVersion)
    throw new ProcurementConflictError('Issued PO/version changed; reload before confirming');
   const saved=await this.repo.confirm(po,actor.userId,input,payload,e);
   await this.audit.record({actorUserId:actor.userId,action:'procurement.supplier_po_acknowledged',
    targetType:'procurement.purchase_order',targetId:po.id,metadata:{confirmationId:saved.id,requestId:payload.clientRequestId}},e);
   return saved;
  });
 }
}
