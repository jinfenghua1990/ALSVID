import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const FinanceCapability={
  Read:'finance.read',DocumentWrite:'finance.document.write',DocumentPost:'finance.document.post',PaymentWrite:'finance.payment.write',Allocate:'finance.allocate',Reconcile:'finance.reconcile',LandedCost:'finance.landed_cost',
} as const;

export type FinanceDocumentType='SUPPLIER_INVOICE'|'CUSTOMER_INVOICE'|'SUPPLIER_CREDIT_NOTE'|'CUSTOMER_CREDIT_NOTE'|'DEBIT_NOTE'|'OTHER';
export type FinanceSourceType='PROCUREMENT_PO'|'COMMERCE_ORDER'|'LOGISTICS_SHIPMENT'|'MANUAL';
export type FinanceDirection='AR'|'AP';
export type PaymentDirection='INBOUND'|'OUTBOUND';
export class FinanceValidationError extends Error{}
export class FinanceNotFoundError extends Error{}
export class FinanceConflictError extends Error{}

function requireCapability(actor:AuthContext,permission:string):void{if(!actor.permissions.includes(permission))throw new PermissionDeniedError(permission);}
function currency(value:string):string{const result=value.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(result))throw new FinanceValidationError('currency must be a three-letter uppercase code');return result;}
function positive(value:string|number,name:string):string{const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text)||/^0+(?:\.0+)?$/.test(text))throw new FinanceValidationError(`${name} must be a positive decimal`);return text;}
function nonNegative(value:string|number,name:string):string{const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text))throw new FinanceValidationError(`${name} must be zero or a positive decimal`);return text;}
function requiredText(value:unknown,name:string):string{const result=String(value??'').trim();if(!result)throw new FinanceValidationError(`${name} is required`);return result;}
function source(input:{sourceType?:FinanceSourceType;sourceId?:string}):{sourceType:FinanceSourceType;sourceId:string|null}{const sourceType=input.sourceType??'MANUAL';if(!['PROCUREMENT_PO','COMMERCE_ORDER','LOGISTICS_SHIPMENT','MANUAL'].includes(sourceType))throw new FinanceValidationError('Invalid Finance source type');if(sourceType==='MANUAL')return{sourceType,sourceId:null};if(!input.sourceId)throw new FinanceValidationError('sourceId is required for non-manual Finance source');return{sourceType,sourceId:input.sourceId};}

export interface FinanceDocumentLineInput{
  category:'GOODS'|'FREIGHT'|'INSURANCE'|'DUTY'|'IMPORT_VAT'|'ANTI_DUMPING'|'COUNTERVAILING'|'OPERATIONAL_FEE'|'SERVICE'|'OTHER';
  description?:string;quantity?:string|number;unit?:string;unitPrice?:string|number;netAmount:string|number;taxAmount?:string|number;skuId?:string;shipmentId?:string;metadata?:Record<string,unknown>;
}
export interface CreateFinanceDocumentInput{
  documentType:FinanceDocumentType;partnerId:string;externalReference?:string;currency:string;issueDate:string;dueDate?:string;sourceType?:FinanceSourceType;sourceId?:string;note?:string;lines?:FinanceDocumentLineInput[];
}

export class FinanceService{
  constructor(private readonly database:Database,private readonly audit:AuditService){}

  async summary(actor:AuthContext):Promise<any>{
    requireCapability(actor,FinanceCapability.Read);
    const [documents,lines,obligations,payments,allocations,fxRates,landedBatches,landedComponents,landedAllocations,partnerBalances,partners,purchaseOrders,commerceOrders,shipments,cargo,customsLines]=await Promise.all([
      this.database.query<any>(`SELECT d.*,p.partner_code,p.display_name AS partner_name FROM finance.documents d JOIN partners.partners p ON p.id=d.partner_id ORDER BY d.created_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT l.*,s.sku,sh.shipment_number FROM finance.document_lines l LEFT JOIN product.skus s ON s.id=l.sku_id LEFT JOIN logistics.shipments sh ON sh.id=l.shipment_id ORDER BY l.document_id,l.line_no`),
      this.database.query<any>(`SELECT o.*,p.partner_code,p.display_name AS partner_name,d.document_number,d.external_reference FROM finance.v_obligations o JOIN partners.partners p ON p.id=o.partner_id LEFT JOIN finance.documents d ON d.id=o.document_id ORDER BY o.created_at DESC LIMIT 1500`),
      this.database.query<any>(`SELECT p.*,pa.partner_code,pa.display_name AS partner_name FROM finance.v_payments p LEFT JOIN partners.partners pa ON pa.id=p.partner_id ORDER BY p.value_date DESC,p.created_at DESC LIMIT 1500`),
      this.database.query<any>(`SELECT a.*,p.payment_number,o.obligation_number,r.id AS reversal_id,r.reason AS reversal_reason FROM finance.allocations a JOIN finance.payments p ON p.id=a.payment_id JOIN finance.obligations o ON o.id=a.obligation_id LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id ORDER BY a.allocated_at DESC LIMIT 3000`),
      this.database.query<any>(`SELECT * FROM finance.fx_rates ORDER BY effective_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT b.*,s.shipment_number,s.status AS shipment_status FROM finance.landed_cost_batches b JOIN logistics.shipments s ON s.id=b.shipment_id ORDER BY b.created_at DESC LIMIT 500`),
      this.database.query<any>(`SELECT c.*,d.document_number,cl.hs_code,cl.cn_code FROM finance.landed_cost_components c LEFT JOIN finance.documents d ON d.id=c.source_document_id LEFT JOIN logistics.customs_lines cl ON cl.id=c.source_customs_line_id ORDER BY c.created_at,c.id`),
      this.database.query<any>(`SELECT a.*,c.batch_id,sc.item_kind,sc.sku_id,sc.vehicle_id,s.sku,v.frame_number FROM finance.landed_cost_allocations a JOIN finance.landed_cost_components c ON c.id=a.component_id JOIN logistics.shipment_cargo sc ON sc.id=a.cargo_id LEFT JOIN product.skus s ON s.id=sc.sku_id LEFT JOIN vehicle.vehicles v ON v.id=sc.vehicle_id ORDER BY a.created_at,a.id`),
      this.database.query<any>(`SELECT b.*,p.partner_code,p.display_name AS partner_name FROM finance.v_partner_balances b JOIN partners.partners p ON p.id=b.partner_id ORDER BY lower(p.display_name),b.currency,b.direction`),
      this.database.query<any>(`SELECT p.id,p.partner_code,p.display_name,p.country_code,COALESCE(array_agg(r.role ORDER BY r.role) FILTER (WHERE r.enabled),ARRAY[]::text[]) AS roles FROM partners.partners p LEFT JOIN partners.roles r ON r.partner_id=p.id WHERE p.status='ACTIVE' GROUP BY p.id ORDER BY lower(p.display_name)`),
      this.database.query<any>(`SELECT po.id,po.po_number,po.supplier_partner_id,p.display_name AS supplier_name,po.currency,po.status,po.payment_terms,po.deposit_terms FROM procurement.purchase_orders po JOIN partners.partners p ON p.id=po.supplier_partner_id WHERE po.status<>'CANCELLED' ORDER BY po.created_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT o.id,o.external_order_id,o.external_order_name,o.customer_partner_id,o.dealer_partner_id,COALESCE(cp.display_name,dp.display_name) AS finance_partner_name,COALESCE(o.customer_partner_id,o.dealer_partner_id) AS finance_partner_id,o.currency,o.total_amount,o.financial_status,o.source_updated_at FROM commerce.external_orders o LEFT JOIN partners.partners cp ON cp.id=o.customer_partner_id LEFT JOIN partners.partners dp ON dp.id=o.dealer_partner_id ORDER BY o.updated_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT id,shipment_number,route_type,status FROM logistics.shipments ORDER BY created_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT c.id,c.shipment_id,c.item_kind,c.sku_id,c.vehicle_id,c.quantity,s.sku,v.frame_number FROM logistics.shipment_cargo c LEFT JOIN product.skus s ON s.id=c.sku_id LEFT JOIN vehicle.vehicles v ON v.id=c.vehicle_id ORDER BY c.created_at,c.id`),
      this.database.query<any>(`SELECT l.*,d.shipment_id,d.currency,d.declaration_code FROM logistics.customs_lines l JOIN logistics.customs_declarations d ON d.id=l.declaration_id ORDER BY l.created_at,l.id`),
    ]);
    return{documents:documents.rows,lines:lines.rows,obligations:obligations.rows,payments:payments.rows,allocations:allocations.rows,fxRates:fxRates.rows,landedBatches:landedBatches.rows,landedComponents:landedComponents.rows,landedAllocations:landedAllocations.rows,partnerBalances:partnerBalances.rows,references:{partners:partners.rows,purchaseOrders:purchaseOrders.rows,commerceOrders:commerceOrders.rows,shipments:shipments.rows,cargo:cargo.rows,customsLines:customsLines.rows}};
  }

  async createDocument(actor:AuthContext,input:CreateFinanceDocumentInput):Promise<any>{
    requireCapability(actor,FinanceCapability.DocumentWrite);
    const src=source(input);const docCurrency=currency(input.currency);const documentType=input.documentType;
    if(!['SUPPLIER_INVOICE','CUSTOMER_INVOICE','SUPPLIER_CREDIT_NOTE','CUSTOMER_CREDIT_NOTE','DEBIT_NOTE','OTHER'].includes(documentType))throw new FinanceValidationError('Invalid documentType');
    if(!input.partnerId)throw new FinanceValidationError('partnerId is required');if(!input.issueDate)throw new FinanceValidationError('issueDate is required');
    try{return await this.database.transaction(async client=>{
      const created=await client.query<any>(`INSERT INTO finance.documents(document_type,partner_id,external_reference,currency,issue_date,due_date,source_type,source_id,note,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,[documentType,input.partnerId,input.externalReference?.trim()||null,docCurrency,input.issueDate,input.dueDate||null,src.sourceType,src.sourceId,input.note?.trim()??'',actor.userId]);
      const documentId=created.rows[0].id;
      let lineNo=1;for(const line of input.lines??[]){await client.query(`INSERT INTO finance.document_lines(document_id,line_no,category,description,quantity,unit,unit_price,net_amount,tax_amount,sku_id,shipment_id,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,[documentId,lineNo++,line.category,line.description?.trim()??'',positive(line.quantity??1,'quantity'),line.unit?.trim().toUpperCase()||'EA',nonNegative(line.unitPrice??0,'unitPrice'),nonNegative(line.netAmount,'netAmount'),nonNegative(line.taxAmount??0,'taxAmount'),line.skuId||null,line.shipmentId||null,JSON.stringify(line.metadata??{})]);}
      const updated=await client.query<any>(`UPDATE finance.documents d SET subtotal_amount=x.net,tax_amount=x.tax,total_amount=x.net+x.tax,updated_at=now() FROM (SELECT COALESCE(sum(net_amount),0)::numeric(20,6) AS net,COALESCE(sum(tax_amount),0)::numeric(20,6) AS tax FROM finance.document_lines WHERE document_id=$1) x WHERE d.id=$1 RETURNING d.*`,[documentId]);
      await this.audit.record({actorUserId:actor.userId,action:'finance.document_created',targetType:'finance.document',targetId:documentId,metadata:{documentType,sourceType:src.sourceType}},client);return updated.rows[0];
    });}catch(error:any){this.rethrow(error);}
  }

  async verifyDocument(actor:AuthContext,documentId:string,expectedVersion:number):Promise<any>{
    requireCapability(actor,FinanceCapability.DocumentPost);return this.transitionDocument(actor,documentId,expectedVersion,'VERIFIED');
  }
  async returnDocumentToDraft(actor:AuthContext,documentId:string,expectedVersion:number):Promise<any>{
    requireCapability(actor,FinanceCapability.DocumentPost);return this.transitionDocument(actor,documentId,expectedVersion,'DRAFT');
  }
  async voidDocument(actor:AuthContext,documentId:string,expectedVersion:number,reason:string):Promise<any>{
    requireCapability(actor,FinanceCapability.DocumentPost);const note=requiredText(reason,'reason');
    try{const result=await this.database.query<any>(`UPDATE finance.documents SET status='VOIDED',voided_at=now(),voided_by=$3,void_reason=$4,version=version+1,updated_by=$3,updated_at=now() WHERE id=$1 AND version=$2 AND status IN ('DRAFT','VERIFIED') RETURNING *`,[documentId,expectedVersion,actor.userId,note]);if(!result.rows[0])throw new FinanceConflictError('Finance document changed or cannot be voided');await this.audit.record({actorUserId:actor.userId,action:'finance.document_voided',targetType:'finance.document',targetId:documentId,metadata:{reason:note}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async postDocument(actor:AuthContext,documentId:string,expectedVersion:number):Promise<{document:any;obligation:any|null}>{
    requireCapability(actor,FinanceCapability.DocumentPost);
    try{return await this.database.transaction(async client=>{
      const locked=await client.query<any>(`SELECT * FROM finance.documents WHERE id=$1 FOR UPDATE`,[documentId]);const current=locked.rows[0];if(!current)throw new FinanceNotFoundError('Finance document not found');if(current.version!==expectedVersion||current.status!=='VERIFIED')throw new FinanceConflictError('Finance document changed or is not verified');
      const posted=await client.query<any>(`UPDATE finance.documents SET status='POSTED',posted_at=now(),posted_by=$3,version=version+1,updated_by=$3,updated_at=now() WHERE id=$1 AND version=$2 AND status='VERIFIED' RETURNING *`,[documentId,expectedVersion,actor.userId]);if(!posted.rows[0])throw new FinanceConflictError('Finance document changed while posting');
      let obligation:any=null;if(['SUPPLIER_INVOICE','CUSTOMER_INVOICE'].includes(current.document_type)){
        const direction=current.document_type==='SUPPLIER_INVOICE'?'AP':'AR';
        const created=await client.query<any>(`INSERT INTO finance.obligations(direction,partner_id,document_id,currency,original_amount,due_date,source_type,source_id,note,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[direction,current.partner_id,current.id,current.currency,current.total_amount,current.due_date,current.source_type,current.source_id,`Created from ${current.document_number}`,actor.userId]);obligation=created.rows[0];
      }
      await this.audit.record({actorUserId:actor.userId,action:'finance.document_posted',targetType:'finance.document',targetId:documentId,metadata:{obligationId:obligation?.id??null}},client);return{document:posted.rows[0],obligation};
    });}catch(error:any){this.rethrow(error);}
  }

  async createObligation(actor:AuthContext,input:{direction:FinanceDirection;partnerId:string;currency:string;amount:string|number;dueDate?:string;sourceType?:FinanceSourceType;sourceId?:string;note?:string}):Promise<any>{
    requireCapability(actor,FinanceCapability.DocumentPost);const src=source(input);if(!['AR','AP'].includes(input.direction))throw new FinanceValidationError('direction must be AR or AP');
    try{const result=await this.database.query<any>(`INSERT INTO finance.obligations(direction,partner_id,currency,original_amount,due_date,source_type,source_id,note,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[input.direction,input.partnerId,currency(input.currency),positive(input.amount,'amount'),input.dueDate||null,src.sourceType,src.sourceId,input.note?.trim()??'',actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.obligation_created',targetType:'finance.obligation',targetId:result.rows[0].id,metadata:{direction:input.direction,sourceType:src.sourceType}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async voidObligation(actor:AuthContext,obligationId:string,reason:string):Promise<any>{
    requireCapability(actor,FinanceCapability.Reconcile);try{const result=await this.database.query<any>(`INSERT INTO finance.obligation_voids(obligation_id,reason,voided_by) VALUES ($1,$2,$3) RETURNING *`,[obligationId,requiredText(reason,'reason'),actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.obligation_voided',targetType:'finance.obligation',targetId:obligationId,metadata:{reason}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async createPayment(actor:AuthContext,input:{direction:PaymentDirection;partnerId?:string;currency:string;amount:string|number;valueDate:string;provider?:string;accountReference?:string;externalReference?:string;idempotencyKey:string;note?:string}):Promise<any>{
    requireCapability(actor,FinanceCapability.PaymentWrite);if(!['INBOUND','OUTBOUND'].includes(input.direction))throw new FinanceValidationError('Invalid payment direction');
    try{const result=await this.database.query<any>(`INSERT INTO finance.payments(direction,partner_id,currency,amount,value_date,provider,account_reference,external_reference,idempotency_key,note,posted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[input.direction,input.partnerId||null,currency(input.currency),positive(input.amount,'amount'),input.valueDate,input.provider?.trim()||'MANUAL',input.accountReference?.trim()||null,input.externalReference?.trim()||null,requiredText(input.idempotencyKey,'idempotencyKey'),input.note?.trim()??'',actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.payment_recorded',targetType:'finance.payment',targetId:result.rows[0].id,metadata:{direction:input.direction}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async reversePayment(actor:AuthContext,paymentId:string,reason:string):Promise<any>{
    requireCapability(actor,FinanceCapability.PaymentWrite);try{const result=await this.database.query<any>(`INSERT INTO finance.payment_reversals(payment_id,reason,reversed_by) VALUES ($1,$2,$3) RETURNING *`,[paymentId,requiredText(reason,'reason'),actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.payment_reversed',targetType:'finance.payment',targetId:paymentId,metadata:{reason}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async createFxRate(actor:AuthContext,input:{baseCurrency:string;quoteCurrency:string;rate:string|number;effectiveAt:string;source:string;externalReference?:string}):Promise<any>{
    requireCapability(actor,FinanceCapability.Allocate);try{const result=await this.database.query<any>(`INSERT INTO finance.fx_rates(base_currency,quote_currency,rate,effective_at,source,external_reference,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[currency(input.baseCurrency),currency(input.quoteCurrency),positive(input.rate,'rate'),input.effectiveAt,requiredText(input.source,'source'),input.externalReference?.trim()||null,actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.fx_rate_recorded',targetType:'finance.fx_rate',targetId:result.rows[0].id});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async allocatePayment(actor:AuthContext,input:{paymentId:string;obligationId:string;paymentAmount:string|number;obligationAmount:string|number;fxRateId?:string;note?:string}):Promise<any>{
    requireCapability(actor,FinanceCapability.Allocate);try{const result=await this.database.query<any>(`INSERT INTO finance.allocations(payment_id,obligation_id,payment_amount,obligation_amount,fx_rate_id,note,allocated_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[input.paymentId,input.obligationId,positive(input.paymentAmount,'paymentAmount'),positive(input.obligationAmount,'obligationAmount'),input.fxRateId||null,input.note?.trim()??'',actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.payment_allocated',targetType:'finance.allocation',targetId:result.rows[0].id,metadata:{paymentId:input.paymentId,obligationId:input.obligationId}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async reverseAllocation(actor:AuthContext,allocationId:string,reason:string):Promise<any>{
    requireCapability(actor,FinanceCapability.Allocate);try{const result=await this.database.query<any>(`INSERT INTO finance.allocation_reversals(allocation_id,reason,reversed_by) VALUES ($1,$2,$3) RETURNING *`,[allocationId,requiredText(reason,'reason'),actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.allocation_reversed',targetType:'finance.allocation',targetId:allocationId,metadata:{reason}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async createLandedCostBatch(actor:AuthContext,input:{shipmentId:string;currency:string;allocationBasis:'QUANTITY'|'VALUE'|'WEIGHT'|'MANUAL';note?:string}):Promise<any>{
    requireCapability(actor,FinanceCapability.LandedCost);try{const result=await this.database.query<any>(`INSERT INTO finance.landed_cost_batches(shipment_id,currency,allocation_basis,note,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[input.shipmentId,currency(input.currency),input.allocationBasis,input.note?.trim()??'',actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.landed_cost_batch_created',targetType:'finance.landed_cost_batch',targetId:result.rows[0].id,metadata:{shipmentId:input.shipmentId}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async addLandedCostComponent(actor:AuthContext,batchId:string,input:{category:string;amount:string|number;currency:string;batchCurrencyAmount:string|number;fxRateId?:string;sourceDocumentId?:string;sourceCustomsLineId?:string;capitalizable?:boolean;note?:string}):Promise<any>{
    requireCapability(actor,FinanceCapability.LandedCost);try{const result=await this.database.query<any>(`INSERT INTO finance.landed_cost_components(batch_id,category,amount,currency,batch_currency_amount,fx_rate_id,source_document_id,source_customs_line_id,capitalizable,note,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[batchId,input.category,nonNegative(input.amount,'amount'),currency(input.currency),nonNegative(input.batchCurrencyAmount,'batchCurrencyAmount'),input.fxRateId||null,input.sourceDocumentId||null,input.sourceCustomsLineId||null,input.capitalizable??true,input.note?.trim()??'',actor.userId]);await this.audit.record({actorUserId:actor.userId,action:'finance.landed_cost_component_added',targetType:'finance.landed_cost_component',targetId:result.rows[0].id,metadata:{batchId,category:input.category}});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async allocateLandedCost(actor:AuthContext,componentId:string,input:{cargoId:string;allocatedAmount:string|number;basisValue?:string|number}):Promise<any>{
    requireCapability(actor,FinanceCapability.LandedCost);try{const result=await this.database.query<any>(`INSERT INTO finance.landed_cost_allocations(component_id,cargo_id,basis_value,allocated_amount,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[componentId,input.cargoId,input.basisValue===undefined?null:nonNegative(input.basisValue,'basisValue'),nonNegative(input.allocatedAmount,'allocatedAmount'),actor.userId]);return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  async finalizeLandedCostBatch(actor:AuthContext,batchId:string):Promise<any>{
    requireCapability(actor,FinanceCapability.LandedCost);try{const result=await this.database.query<any>(`UPDATE finance.landed_cost_batches SET status='FINALIZED',finalized_at=now(),finalized_by=$2 WHERE id=$1 AND status='DRAFT' RETURNING *`,[batchId,actor.userId]);if(!result.rows[0])throw new FinanceConflictError('Landed-cost batch is missing or already finalized');await this.audit.record({actorUserId:actor.userId,action:'finance.landed_cost_finalized',targetType:'finance.landed_cost_batch',targetId:batchId});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  private async transitionDocument(actor:AuthContext,documentId:string,expectedVersion:number,status:'VERIFIED'|'DRAFT'):Promise<any>{
    if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)throw new FinanceValidationError('expectedVersion is required');
    try{const result=await this.database.query<any>(`UPDATE finance.documents SET status=$3,verified_at=CASE WHEN $3='VERIFIED' THEN now() ELSE NULL END,verified_by=CASE WHEN $3='VERIFIED' THEN $4 ELSE NULL END,version=version+1,updated_by=$4,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *`,[documentId,expectedVersion,status,actor.userId]);if(!result.rows[0])throw new FinanceConflictError('Finance document changed or transition is invalid');await this.audit.record({actorUserId:actor.userId,action:`finance.document_${status.toLowerCase()}`,targetType:'finance.document',targetId:documentId});return result.rows[0];}catch(error:any){this.rethrow(error);}
  }

  private rethrow(error:any):never{
    if(error instanceof FinanceValidationError||error instanceof FinanceNotFoundError||error instanceof FinanceConflictError)throw error;
    const message=String(error?.message??'');
    if(error?.code==='23503')throw new FinanceNotFoundError('Referenced Finance/Partner/source entity was not found');
    if(error?.code==='23505')throw new FinanceConflictError(/idempotency/i.test(message)?'Duplicate Payment idempotency key':'Finance record already exists');
    if(error?.code==='23514')throw new FinanceValidationError(message);
    if(/not found|requires mapped|must match|cannot be allocated|cannot be voided|cannot be deleted|immutable|transition|exceeds|already reversed|Reverse active|requires explicit FX|FX rate currencies|must belong|fully allocated|source Partner|source currency/i.test(message))throw new FinanceConflictError(message);
    if(/must be|required|Invalid|currency/i.test(message))throw new FinanceValidationError(message);
    throw error;
  }
}
