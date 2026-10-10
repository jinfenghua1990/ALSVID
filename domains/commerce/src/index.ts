import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const CommerceCapability={Read:'commerce.read',Map:'commerce.map',Reconcile:'commerce.reconcile'} as const;
export class CommerceValidationError extends Error{}
export class CommerceNotFoundError extends Error{}
export class CommerceConflictError extends Error{}

export interface NormalizedOrderLine{
  externalLineId:string;
  externalProductId?:string;
  externalVariantId?:string;
  externalSku?:string;
  title?:string;
  quantity:string|number;
  unitPrice:string|number;
  sourceUpdatedAt?:string;
}
export interface NormalizedOrder{
  externalOrderId:string;
  externalOrderName?:string;
  externalCustomerId?:string;
  orderStatus:string;
  financialStatus?:string;
  fulfillmentStatus?:string;
  currency:string;
  subtotalAmount:string|number;
  totalAmount:string|number;
  sourceCreatedAt?:string;
  sourceUpdatedAt?:string;
  lines:NormalizedOrderLine[];
}
export interface NormalizedFulfillmentLine{externalLineId:string;quantity:string|number;}
export interface NormalizedFulfillment{
  externalFulfillmentId:string;
  externalOrderId:string;
  status:string;
  trackingCompany?:string;
  trackingNumber?:string;
  sourceCreatedAt?:string;
  sourceUpdatedAt?:string;
  lines:NormalizedFulfillmentLine[];
}

function requireCapability(actor:AuthContext,permission:string){if(!actor.permissions.includes(permission))throw new PermissionDeniedError(permission);}
function requireIngest(actor:AuthContext){if(!actor.permissions.includes('integrations.ingest')&&!actor.permissions.includes('integrations.replay'))throw new PermissionDeniedError('integrations.ingest');}
function nonempty(value:string|undefined,name:string){const text=value?.trim();if(!text)throw new CommerceValidationError(`${name} is required`);return text;}
function currency(value:string){const text=value.trim().toUpperCase();if(!/^[A-Z]{3}$/.test(text))throw new CommerceValidationError('currency must be ISO alpha-3');return text;}
function decimal(value:string|number,name:string,allowZero=true){const text=String(value).trim();if(!/^\d+(?:\.\d{1,6})?$/.test(text)||(!allowZero&&/^0+(?:\.0+)?$/.test(text)))throw new CommerceValidationError(`${name} must be ${allowZero?'zero or ':''}a positive decimal`);return text;}

export class CommerceService{
  constructor(private readonly database:Database,private readonly audit:AuditService){}

  async summary(actor:AuthContext):Promise<any>{
    requireCapability(actor,CommerceCapability.Read);
    const [channels,mappings,orders,lines,fulfillments,fulfillmentLines,exceptions,exceptionEvents]=await Promise.all([
      this.database.query<any>(`SELECT c.*,p.partner_code AS default_dealer_code,p.display_name AS default_dealer_name FROM commerce.channels c LEFT JOIN partners.partners p ON p.id=c.default_dealer_partner_id ORDER BY c.created_at DESC`),
      this.database.query<any>(`SELECT m.*,c.channel_key,c.display_name AS channel_name,s.sku,s.name AS sku_name FROM commerce.sku_mappings m JOIN commerce.channels c ON c.id=m.channel_id JOIN product.skus s ON s.id=m.sku_id ORDER BY m.updated_at DESC`),
      this.database.query<any>(`SELECT o.*,c.provider,c.channel_key,c.display_name AS channel_name,dp.display_name AS dealer_name,cp.display_name AS customer_name FROM commerce.external_orders o JOIN commerce.channels c ON c.id=o.channel_id LEFT JOIN partners.partners dp ON dp.id=o.dealer_partner_id LEFT JOIN partners.partners cp ON cp.id=o.customer_partner_id ORDER BY COALESCE(o.source_updated_at,o.updated_at) DESC LIMIT 1000`),
      this.database.query<any>(`SELECT l.*,o.external_order_id,o.external_order_name,c.channel_key,s.sku AS mapped_sku,s.name AS mapped_sku_name FROM commerce.external_order_lines l JOIN commerce.external_orders o ON o.id=l.order_id JOIN commerce.channels c ON c.id=o.channel_id LEFT JOIN product.skus s ON s.id=l.sku_id ORDER BY l.updated_at DESC LIMIT 5000`),
      this.database.query<any>(`SELECT f.*,o.external_order_id,o.external_order_name,c.channel_key,sh.shipment_number FROM commerce.fulfillments f JOIN commerce.external_orders o ON o.id=f.order_id JOIN commerce.channels c ON c.id=f.channel_id LEFT JOIN logistics.shipments sh ON sh.id=f.logistics_shipment_id ORDER BY COALESCE(f.source_updated_at,f.updated_at) DESC LIMIT 2000`),
      this.database.query<any>(`SELECT fl.*,ol.external_line_id,ol.title FROM commerce.fulfillment_lines fl JOIN commerce.external_order_lines ol ON ol.id=fl.order_line_id ORDER BY fl.id`),
      this.database.query<any>(`SELECT e.*,c.channel_key FROM commerce.mapping_exceptions e JOIN commerce.channels c ON c.id=e.channel_id ORDER BY CASE e.status WHEN 'OPEN' THEN 0 ELSE 1 END,e.created_at DESC LIMIT 2000`),
      this.database.query<any>(`SELECT * FROM commerce.exception_events ORDER BY occurred_at DESC,id DESC LIMIT 5000`),
    ]);
    return{channels:channels.rows,mappings:mappings.rows,orders:orders.rows,lines:lines.rows,fulfillments:fulfillments.rows,fulfillmentLines:fulfillmentLines.rows,exceptions:exceptions.rows,exceptionEvents:exceptionEvents.rows};
  }

  async createChannel(actor:AuthContext,input:{provider:'SHOPIFY'|'OTHER';channelKey:string;displayName:string;externalAccountId:string;defaultDealerPartnerId?:string;requiresDealer?:boolean;metadata?:Record<string,unknown>}):Promise<any>{
    requireCapability(actor,CommerceCapability.Map);
    try{
      const result=await this.database.query<any>(`INSERT INTO commerce.channels(provider,channel_key,display_name,external_account_id,default_dealer_partner_id,requires_dealer,metadata,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8) RETURNING *`,[input.provider,nonempty(input.channelKey,'channelKey'),nonempty(input.displayName,'displayName'),nonempty(input.externalAccountId,'externalAccountId'),input.defaultDealerPartnerId||null,input.requiresDealer??false,JSON.stringify(input.metadata??{}),actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'commerce.channel_created',targetType:'commerce.channel',targetId:result.rows[0].id,metadata:{provider:input.provider}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async mapVariant(actor:AuthContext,input:{channelId:string;externalVariantId:string;externalProductId?:string;externalSku?:string;skuId:string}):Promise<any>{
    requireCapability(actor,CommerceCapability.Map);
    try{
      const result=await this.database.transaction(async client=>{
        const mapping=await client.query<any>(`INSERT INTO commerce.sku_mappings(channel_id,external_variant_id,external_product_id,external_sku,sku_id,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6)
          ON CONFLICT (channel_id,external_variant_id) DO UPDATE SET external_product_id=EXCLUDED.external_product_id,external_sku=EXCLUDED.external_sku,sku_id=EXCLUDED.sku_id,enabled=true,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`,[input.channelId,nonempty(input.externalVariantId,'externalVariantId'),input.externalProductId?.trim()||null,input.externalSku?.trim()||null,input.skuId,actor.userId]);
        const affected=await client.query<{id:string}>(`UPDATE commerce.external_order_lines l SET sku_id=$3,mapping_source='MANUAL',updated_at=now() FROM commerce.external_orders o WHERE l.order_id=o.id AND o.channel_id=$1 AND l.external_variant_id=$2 RETURNING l.id`,[input.channelId,input.externalVariantId,input.skuId]);
        for(const line of affected.rows)await this.resolveOpenException(client,actor,input.channelId,'UNKNOWN_VARIANT','ORDER_LINE',line.id,{skuId:input.skuId,resolution:'VARIANT_MAPPING'});
        await this.audit.record({actorUserId:actor.userId,action:'commerce.variant_mapped',targetType:'commerce.channel',targetId:input.channelId,metadata:{externalVariantId:input.externalVariantId,skuId:input.skuId,affectedLines:affected.rows.length}},client);
        return mapping.rows[0];
      });
      return result;
    }catch(error:any){this.rethrow(error);}
  }

  async mapOrderPartners(actor:AuthContext,orderId:string,input:{dealerPartnerId?:string|null;customerPartnerId?:string|null}):Promise<any>{
    requireCapability(actor,CommerceCapability.Map);
    try{
      return await this.database.transaction(async client=>{
        const updated=await client.query<any>(`UPDATE commerce.external_orders SET
          dealer_partner_id=CASE WHEN $2::boolean THEN $3::uuid ELSE dealer_partner_id END,
          customer_partner_id=CASE WHEN $4::boolean THEN $5::uuid ELSE customer_partner_id END,
          version=version+1,updated_at=now()
          WHERE id=$1 RETURNING *`,[orderId,input.dealerPartnerId!==undefined,input.dealerPartnerId??null,input.customerPartnerId!==undefined,input.customerPartnerId??null]);
        if(!updated.rows[0])throw new CommerceNotFoundError('External order not found');
        if(input.dealerPartnerId)await this.resolveOpenException(client,actor,updated.rows[0].channel_id,'MISSING_DEALER','ORDER',orderId,{dealerPartnerId:input.dealerPartnerId});
        if(input.customerPartnerId)await this.resolveOpenException(client,actor,updated.rows[0].channel_id,'MISSING_CUSTOMER','ORDER',orderId,{customerPartnerId:input.customerPartnerId});
        await this.audit.record({actorUserId:actor.userId,action:'commerce.order_partners_mapped',targetType:'commerce.order',targetId:orderId,metadata:{dealerPartnerId:input.dealerPartnerId??null,customerPartnerId:input.customerPartnerId??null}},client);
        return updated.rows[0];
      });
    }catch(error:any){this.rethrow(error);}
  }

  async mapFulfillmentShipment(actor:AuthContext,fulfillmentId:string,shipmentId:string|null):Promise<any>{
    requireCapability(actor,CommerceCapability.Map);
    try{
      const result=await this.database.query<any>(`UPDATE commerce.fulfillments SET logistics_shipment_id=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING *`,[fulfillmentId,shipmentId]);
      if(!result.rows[0])throw new CommerceNotFoundError('Fulfillment not found');
      await this.audit.record({actorUserId:actor.userId,action:'commerce.fulfillment_shipment_mapped',targetType:'commerce.fulfillment',targetId:fulfillmentId,metadata:{shipmentId}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async resolveException(actor:AuthContext,exceptionId:string,input:{action:'RESOLVED'|'IGNORED';resolution?:Record<string,unknown>}):Promise<any>{
    requireCapability(actor,CommerceCapability.Reconcile);
    return this.database.transaction(async client=>{
      const result=await client.query<any>(`UPDATE commerce.mapping_exceptions SET status=$2,resolution=$3::jsonb,resolved_at=now(),resolved_by=$4 WHERE id=$1 AND status='OPEN' RETURNING *`,[exceptionId,input.action,JSON.stringify(input.resolution??{}),actor.userId]);
      if(!result.rows[0])throw new CommerceConflictError('Exception is missing or no longer open');
      await client.query(`INSERT INTO commerce.exception_events(exception_id,event_type,metadata,actor_user_id) VALUES ($1,$2,$3::jsonb,$4)`,[exceptionId,input.action,JSON.stringify(input.resolution??{}),actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'commerce.exception_resolved',targetType:'commerce.exception',targetId:exceptionId,metadata:{action:input.action}},client);
      return result.rows[0];
    });
  }

  async ingestOrder(actor:AuthContext,channelId:string,providerEventId:string,input:NormalizedOrder,executor:QueryExecutor):Promise<{order:any;applied:boolean}>{
    requireIngest(actor);
    const channelResult=await executor.query<any>(`SELECT * FROM commerce.channels WHERE id=$1`,[channelId]);
    const channel=channelResult.rows[0];if(!channel)throw new CommerceNotFoundError('Commerce channel not found');if(!channel.enabled)throw new CommerceConflictError('Commerce channel is disabled');
    const externalOrderId=nonempty(input.externalOrderId,'externalOrderId');const sourceUpdatedAt=input.sourceUpdatedAt??input.sourceCreatedAt??null;const curr=currency(input.currency);
    const existing=await executor.query<any>(`SELECT * FROM commerce.external_orders WHERE channel_id=$1 AND external_order_id=$2 FOR UPDATE`,[channelId,externalOrderId]);
    const stale=Boolean(existing.rows[0]?.source_updated_at&&sourceUpdatedAt&&new Date(sourceUpdatedAt).getTime()<new Date(existing.rows[0].source_updated_at).getTime());
    let order:any;
    if(!existing.rows[0]){
      const created=await executor.query<any>(`INSERT INTO commerce.external_orders(channel_id,external_order_id,external_order_name,external_customer_id,dealer_partner_id,order_status,financial_status,fulfillment_status,currency,subtotal_amount,total_amount,source_created_at,source_updated_at,last_provider_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[channelId,externalOrderId,input.externalOrderName?.trim()||null,input.externalCustomerId?.trim()||null,channel.default_dealer_partner_id,input.orderStatus||'UNKNOWN',input.financialStatus?.trim()||null,input.fulfillmentStatus?.trim()||null,curr,decimal(input.subtotalAmount,'subtotalAmount'),decimal(input.totalAmount,'totalAmount'),input.sourceCreatedAt||null,sourceUpdatedAt,providerEventId]);
      order=created.rows[0];
    }else if(!stale){
      const updated=await executor.query<any>(`UPDATE commerce.external_orders SET external_order_name=$3,external_customer_id=$4,order_status=$5,financial_status=$6,fulfillment_status=$7,currency=$8,subtotal_amount=$9,total_amount=$10,source_created_at=COALESCE(source_created_at,$11),source_updated_at=$12,last_provider_event_id=$13,version=version+1,updated_at=now() WHERE id=$1 AND channel_id=$2 RETURNING *`,[existing.rows[0].id,channelId,input.externalOrderName?.trim()||null,input.externalCustomerId?.trim()||null,input.orderStatus||'UNKNOWN',input.financialStatus?.trim()||null,input.fulfillmentStatus?.trim()||null,curr,decimal(input.subtotalAmount,'subtotalAmount'),decimal(input.totalAmount,'totalAmount'),input.sourceCreatedAt||null,sourceUpdatedAt,providerEventId]);
      order=updated.rows[0];
    }else order=existing.rows[0];

    await executor.query(`INSERT INTO commerce.order_snapshots(order_id,provider_event_id,order_status,financial_status,fulfillment_status,currency,subtotal_amount,total_amount,source_updated_at,normalized_payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) ON CONFLICT (order_id,provider_event_id) DO NOTHING`,[order.id,providerEventId,input.orderStatus||'UNKNOWN',input.financialStatus?.trim()||null,input.fulfillmentStatus?.trim()||null,curr,decimal(input.subtotalAmount,'subtotalAmount'),decimal(input.totalAmount,'totalAmount'),sourceUpdatedAt,JSON.stringify(input)]);

    if(!stale){
      for(const lineInput of input.lines){
        const externalLineId=nonempty(lineInput.externalLineId,'externalLineId');const variant=lineInput.externalVariantId?.trim()||null;
        const mapping=variant?await executor.query<{sku_id:string}>(`SELECT sku_id FROM commerce.sku_mappings WHERE channel_id=$1 AND external_variant_id=$2 AND enabled=true`,[channelId,variant]):{rows:[] as {sku_id:string}[]};
        const autoSkuId=mapping.rows[0]?.sku_id??null;
        const existingLine=await executor.query<any>(`SELECT * FROM commerce.external_order_lines WHERE order_id=$1 AND external_line_id=$2`,[order.id,externalLineId]);
        let line:any;
        if(existingLine.rows[0]){
          const updated=await executor.query<any>(`UPDATE commerce.external_order_lines SET title=$3,quantity=$4,unit_price=$5,currency=$6,source_updated_at=$7,updated_at=now(),sku_id=CASE WHEN mapping_source='MANUAL' THEN sku_id ELSE $8::uuid END,mapping_source=CASE WHEN mapping_source='MANUAL' THEN mapping_source WHEN $8::uuid IS NULL THEN 'UNMAPPED' ELSE 'AUTO_VARIANT' END WHERE id=$1 AND order_id=$2 RETURNING *`,[existingLine.rows[0].id,order.id,lineInput.title?.trim()??'',decimal(lineInput.quantity,'quantity',false),decimal(lineInput.unitPrice,'unitPrice'),curr,lineInput.sourceUpdatedAt??sourceUpdatedAt,autoSkuId]);line=updated.rows[0];
        }else{
          const created=await executor.query<any>(`INSERT INTO commerce.external_order_lines(order_id,external_line_id,external_product_id,external_variant_id,external_sku,title,quantity,unit_price,currency,sku_id,mapping_source,source_updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[order.id,externalLineId,lineInput.externalProductId?.trim()||null,variant,lineInput.externalSku?.trim()||null,lineInput.title?.trim()??'',decimal(lineInput.quantity,'quantity',false),decimal(lineInput.unitPrice,'unitPrice'),curr,autoSkuId,autoSkuId?'AUTO_VARIANT':'UNMAPPED',lineInput.sourceUpdatedAt??sourceUpdatedAt]);line=created.rows[0];
        }
        if(line.sku_id)await this.resolveOpenException(executor,actor,channelId,'UNKNOWN_VARIANT','ORDER_LINE',line.id,{skuId:line.sku_id,resolution:'AUTO_OR_MANUAL_MAPPING'});
        else await this.openException(executor,channelId,'UNKNOWN_VARIANT','ORDER_LINE',line.id,variant??lineInput.externalSku??externalLineId,`No ALSVID SKU mapping for external variant ${variant??'(missing)'}`);
      }
      if(channel.requires_dealer&&!order.dealer_partner_id)await this.openException(executor,channelId,'MISSING_DEALER','ORDER',order.id,externalOrderId,'Dealer-required channel order has no Dealer mapping');
      if(order.external_customer_id&&!order.customer_partner_id)await this.openException(executor,channelId,'MISSING_CUSTOMER','ORDER',order.id,order.external_customer_id,'External customer is not linked to an ALSVID Customer Partner');
    }
    return{order,applied:!stale};
  }

  async ingestFulfillment(actor:AuthContext,channelId:string,providerEventId:string,input:NormalizedFulfillment,executor:QueryExecutor):Promise<{fulfillment:any;applied:boolean}>{
    requireIngest(actor);
    const orderResult=await executor.query<any>(`SELECT * FROM commerce.external_orders WHERE channel_id=$1 AND external_order_id=$2`,[channelId,nonempty(input.externalOrderId,'externalOrderId')]);
    const order=orderResult.rows[0];if(!order)throw new CommerceNotFoundError('Fulfillment references an unknown external order');
    const existing=await executor.query<any>(`SELECT * FROM commerce.fulfillments WHERE channel_id=$1 AND external_fulfillment_id=$2 FOR UPDATE`,[channelId,nonempty(input.externalFulfillmentId,'externalFulfillmentId')]);
    const sourceUpdatedAt=input.sourceUpdatedAt??input.sourceCreatedAt??null;const stale=Boolean(existing.rows[0]?.source_updated_at&&sourceUpdatedAt&&new Date(sourceUpdatedAt).getTime()<new Date(existing.rows[0].source_updated_at).getTime());
    let fulfillment:any;
    if(!existing.rows[0]){
      const created=await executor.query<any>(`INSERT INTO commerce.fulfillments(channel_id,order_id,external_fulfillment_id,fulfillment_status,tracking_company,tracking_number,source_created_at,source_updated_at,last_provider_event_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[channelId,order.id,input.externalFulfillmentId,input.status||'UNKNOWN',input.trackingCompany?.trim()||null,input.trackingNumber?.trim()||null,input.sourceCreatedAt||null,sourceUpdatedAt,providerEventId]);fulfillment=created.rows[0];
    }else if(!stale){
      const updated=await executor.query<any>(`UPDATE commerce.fulfillments SET fulfillment_status=$3,tracking_company=$4,tracking_number=$5,source_created_at=COALESCE(source_created_at,$6),source_updated_at=$7,last_provider_event_id=$8,version=version+1,updated_at=now() WHERE id=$1 AND channel_id=$2 RETURNING *`,[existing.rows[0].id,channelId,input.status||'UNKNOWN',input.trackingCompany?.trim()||null,input.trackingNumber?.trim()||null,input.sourceCreatedAt||null,sourceUpdatedAt,providerEventId]);fulfillment=updated.rows[0];
    }else fulfillment=existing.rows[0];
    if(!stale){
      for(const lineInput of input.lines){
        const line=await executor.query<{id:string}>(`SELECT id FROM commerce.external_order_lines WHERE order_id=$1 AND external_line_id=$2`,[order.id,lineInput.externalLineId]);
        if(!line.rows[0]){await this.openException(executor,channelId,'CONFLICT','FULFILLMENT',fulfillment.id,lineInput.externalLineId,`Fulfillment references unknown order line ${lineInput.externalLineId}`);continue;}
        await executor.query(`INSERT INTO commerce.fulfillment_lines(fulfillment_id,order_line_id,quantity) VALUES ($1,$2,$3) ON CONFLICT (fulfillment_id,order_line_id) DO UPDATE SET quantity=EXCLUDED.quantity`,[fulfillment.id,line.rows[0].id,decimal(lineInput.quantity,'quantity',false)]);
      }
    }
    return{fulfillment,applied:!stale};
  }

  private async openException(executor:QueryExecutor,channelId:string,type:string,entityType:string,entityId:string,externalReference:string,message:string){
    await executor.query(`INSERT INTO commerce.mapping_exceptions(channel_id,exception_type,entity_type,entity_id,external_reference,message) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (channel_id,exception_type,entity_type,entity_id) WHERE status='OPEN' DO UPDATE SET external_reference=EXCLUDED.external_reference,message=EXCLUDED.message`,[channelId,type,entityType,entityId,externalReference,message]);
  }

  private async resolveOpenException(executor:QueryExecutor,actor:AuthContext,channelId:string,type:string,entityType:string,entityId:string,resolution:Record<string,unknown>){
    const rows=await executor.query<{id:string}>(`UPDATE commerce.mapping_exceptions SET status='RESOLVED',resolution=$5::jsonb,resolved_at=now(),resolved_by=$6 WHERE channel_id=$1 AND exception_type=$2 AND entity_type=$3 AND entity_id=$4 AND status='OPEN' RETURNING id`,[channelId,type,entityType,entityId,JSON.stringify(resolution),actor.userId]);
    for(const row of rows.rows)await executor.query(`INSERT INTO commerce.exception_events(exception_id,event_type,metadata,actor_user_id) VALUES ($1,'RESOLVED',$2::jsonb,$3)`,[row.id,JSON.stringify(resolution),actor.userId]);
  }

  private rethrow(error:any):never{
    if(error instanceof CommerceValidationError||error instanceof CommerceNotFoundError||error instanceof CommerceConflictError)throw error;
    const message=String(error?.message??'');
    if(error?.code==='23503')throw new CommerceNotFoundError('Referenced Channel, Partner, SKU, Shipment or order fact was not found');
    if(error?.code==='23505')throw new CommerceConflictError(message);
    if(error?.code==='23514')throw new CommerceValidationError(message);
    if(/must have enabled DEALER|requires enabled CUSTOMER|must match|immutable|cannot move backwards|Dealer-required channel/i.test(message))throw new CommerceConflictError(message);
    throw error;
  }
}
