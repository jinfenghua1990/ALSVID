import { createHash } from 'node:crypto';
import type { AuditService } from '@alsvid/audit';
import type { CommerceService, NormalizedFulfillment, NormalizedOrder } from '@alsvid/commerce';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const IntegrationCapability={Ingest:'integrations.ingest',Replay:'integrations.replay',Admin:'integrations.admin'} as const;
export class IntegrationValidationError extends Error{}
export class IntegrationNotFoundError extends Error{}
export class IntegrationConflictError extends Error{}

export interface ShopifyDeliveryInput{
  webhookId:string;
  eventId?:string;
  topic:string;
  shopDomain:string;
  apiVersion?:string;
  triggeredAt?:string;
  payload:Record<string,unknown>;
}

function requireCapability(actor:AuthContext,permission:string){if(!actor.permissions.includes(permission))throw new PermissionDeniedError(permission);}
function text(value:unknown):string|null{if(value===undefined||value===null)return null;const result=String(value).trim();return result||null;}
function required(value:unknown,name:string):string{const result=text(value);if(!result)throw new IntegrationValidationError(`${name} is required`);return result;}
function object(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function array(value:unknown):unknown[]{return Array.isArray(value)?value:[];}
function canonical(value:unknown):string{
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  const record=value as Record<string,unknown>;
  return `{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}
function sha256(value:unknown):string{return createHash('sha256').update(canonical(value)).digest('hex');}
function money(value:unknown):string{return text(value)??'0';}
function timestamp(value:unknown):string|undefined{const result=text(value);if(!result)return undefined;const millis=Date.parse(result);if(Number.isNaN(millis))throw new IntegrationValidationError(`Invalid timestamp: ${result}`);return new Date(millis).toISOString();}

function normalizeShopifyOrder(payload:Record<string,unknown>):NormalizedOrder{
  const id=required(payload.id,'Shopify order id');
  const customer=object(payload.customer);
  const lines=array(payload.line_items).map(raw=>{
    const line=object(raw);
    const updatedAt=timestamp(line.updated_at??payload.updated_at);
    return{
      externalLineId:required(line.id,'Shopify line item id'),
      ...(text(line.product_id)?{externalProductId:text(line.product_id)!}:{}),
      ...(text(line.variant_id)?{externalVariantId:text(line.variant_id)!}:{}),
      ...(text(line.sku)?{externalSku:text(line.sku)!}:{}),
      ...(text(line.title??line.name)?{title:text(line.title??line.name)!}:{}),
      quantity:required(line.quantity,'Shopify line quantity'),
      unitPrice:money(line.price),
      ...(updatedAt?{sourceUpdatedAt:updatedAt}:{}),
    };
  });
  const cancelled=Boolean(payload.cancelled_at);
  const closed=Boolean(payload.closed_at);
  const sourceCreatedAt=timestamp(payload.created_at);
  const sourceUpdatedAt=timestamp(payload.updated_at);
  return{
    externalOrderId:id,
    ...(text(payload.name)?{externalOrderName:text(payload.name)!}:{}),
    ...(text(customer.id)?{externalCustomerId:text(customer.id)!}:{}),
    orderStatus:cancelled?'CANCELLED':closed?'CLOSED':'OPEN',
    ...(text(payload.financial_status)?{financialStatus:text(payload.financial_status)!}:{}),
    ...(text(payload.fulfillment_status)?{fulfillmentStatus:text(payload.fulfillment_status)!}:{}),
    currency:required(payload.currency,'Shopify order currency'),
    subtotalAmount:money(payload.subtotal_price??payload.current_subtotal_price),
    totalAmount:money(payload.total_price??payload.current_total_price),
    ...(sourceCreatedAt?{sourceCreatedAt}:{}),
    ...(sourceUpdatedAt?{sourceUpdatedAt}:{}),
    lines,
  };
}

function normalizeShopifyFulfillment(payload:Record<string,unknown>,topic:string):NormalizedFulfillment{
  const sourceCreatedAt=timestamp(payload.created_at);
  const sourceUpdatedAt=timestamp(payload.updated_at);
  const trackingNumbers=array(payload.tracking_numbers).map(text).filter((value):value is string=>Boolean(value));
  const lines=array(payload.line_items).map(raw=>{
    const line=object(raw);
    return{externalLineId:required(line.id??line.line_item_id,'Shopify fulfillment line item id'),quantity:required(line.quantity,'Shopify fulfillment quantity')};
  });
  return{
    externalFulfillmentId:required(payload.id,'Shopify fulfillment id'),
    externalOrderId:required(payload.order_id,'Shopify fulfillment order id'),
    status:topic.includes('cancel')?'CANCELLED':text(payload.status)?.toUpperCase()??'UNKNOWN',
    ...(text(payload.tracking_company)?{trackingCompany:text(payload.tracking_company)!}:{}),
    ...(text(payload.tracking_number)??trackingNumbers[0]?{trackingNumber:(text(payload.tracking_number)??trackingNumbers[0])!}:{}),
    ...(sourceCreatedAt?{sourceCreatedAt}:{}),
    ...(sourceUpdatedAt?{sourceUpdatedAt}:{}),
    lines,
  };
}

export class IntegrationService{
  constructor(private readonly database:Database,private readonly audit:AuditService,private readonly commerce:CommerceService){}

  async summary(actor:AuthContext):Promise<any>{
    requireCapability(actor,'commerce.read');
    const [receipts,attempts,cursors]=await Promise.all([
      this.database.query<any>(`SELECT r.*,c.provider AS channel_provider,c.channel_key,c.display_name AS channel_name FROM integrations.webhook_receipts r JOIN commerce.channels c ON c.id=r.channel_id ORDER BY r.received_at DESC LIMIT 1000`),
      this.database.query<any>(`SELECT a.*,r.provider_event_id,r.topic,c.channel_key FROM integrations.ingestion_attempts a JOIN integrations.webhook_receipts r ON r.id=a.receipt_id JOIN commerce.channels c ON c.id=r.channel_id ORDER BY a.occurred_at DESC,a.id DESC LIMIT 3000`),
      this.database.query<any>(`SELECT s.*,c.channel_key,c.provider FROM integrations.sync_cursors s JOIN commerce.channels c ON c.id=s.channel_id ORDER BY s.updated_at DESC`),
    ]);
    return{receipts:receipts.rows,attempts:attempts.rows,cursors:cursors.rows};
  }

  async ingestShopify(actor:AuthContext,channelId:string,input:ShopifyDeliveryInput):Promise<{receipt:any;attempt:any;duplicate:boolean;entity?:any}>{
    requireCapability(actor,IntegrationCapability.Ingest);
    return this.ingestShopifyInternal(actor,channelId,input,false);
  }

  async replayShopify(actor:AuthContext,receiptId:string):Promise<{receipt:any;attempt:any;duplicate:boolean;entity?:any}>{
    requireCapability(actor,IntegrationCapability.Replay);
    const row=await this.database.query<any>(`SELECT r.*,c.external_account_id,c.provider FROM integrations.webhook_receipts r JOIN commerce.channels c ON c.id=r.channel_id WHERE r.id=$1`,[receiptId]);
    const receipt=row.rows[0];if(!receipt)throw new IntegrationNotFoundError('Webhook receipt not found');
    if(receipt.provider!=='SHOPIFY')throw new IntegrationValidationError('Receipt is not a Shopify delivery');
    const payload=object(receipt.payload);
    return this.ingestShopifyInternal(actor,receipt.channel_id,{
      webhookId:receipt.provider_event_id,
      topic:receipt.topic,
      shopDomain:receipt.external_account_id,
      ...(receipt.provider_occurred_at?{triggeredAt:new Date(receipt.provider_occurred_at).toISOString()}:{}),
      payload,
    },true);
  }

  async setCursor(actor:AuthContext,channelId:string,input:{cursorKey:string;cursorValue:string;sourceUpdatedAt?:string}):Promise<any>{
    requireCapability(actor,IntegrationCapability.Admin);
    const sourceUpdatedAt=timestamp(input.sourceUpdatedAt);
    const result=await this.database.query<any>(`INSERT INTO integrations.sync_cursors(channel_id,cursor_key,cursor_value,source_updated_at,updated_by) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (channel_id,cursor_key) DO UPDATE SET cursor_value=EXCLUDED.cursor_value,source_updated_at=EXCLUDED.source_updated_at,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`,[channelId,required(input.cursorKey,'cursorKey'),required(input.cursorValue,'cursorValue'),sourceUpdatedAt??null,actor.userId]);
    await this.audit.record({actorUserId:actor.userId,action:'integration.cursor_updated',targetType:'integration.cursor',targetId:result.rows[0].id,metadata:{channelId,cursorKey:input.cursorKey}});
    return result.rows[0];
  }

  private async ingestShopifyInternal(actor:AuthContext,channelId:string,input:ShopifyDeliveryInput,replay:boolean):Promise<{receipt:any;attempt:any;duplicate:boolean;entity?:any}>{
    const webhookId=required(input.webhookId,'webhookId');
    const topic=required(input.topic,'topic').toLowerCase();
    const shopDomain=required(input.shopDomain,'shopDomain').toLowerCase();
    const hash=sha256(input.payload);
    const triggeredAt=timestamp(input.triggeredAt);
    const channelResult=await this.database.query<any>(`SELECT * FROM commerce.channels WHERE id=$1`,[channelId]);
    const channel=channelResult.rows[0];if(!channel)throw new IntegrationNotFoundError('Commerce channel not found');
    if(channel.provider!=='SHOPIFY')throw new IntegrationValidationError('Channel is not a Shopify channel');
    if(String(channel.external_account_id).toLowerCase()!==shopDomain)throw new IntegrationConflictError('Shopify shop domain does not match channel external account');

    let receipt:any;let duplicate=false;
    try{
      const inserted=await this.database.query<any>(`INSERT INTO integrations.webhook_receipts(channel_id,provider,provider_event_id,topic,payload_sha256,payload,provider_occurred_at) VALUES ($1,'SHOPIFY',$2,$3,$4,$5::jsonb,$6) ON CONFLICT (channel_id,provider_event_id) DO NOTHING RETURNING *`,[channelId,webhookId,topic,hash,JSON.stringify(input.payload),triggeredAt??null]);
      if(inserted.rows[0])receipt=inserted.rows[0];
      else{
        duplicate=true;
        const existing=await this.database.query<any>(`SELECT * FROM integrations.webhook_receipts WHERE channel_id=$1 AND provider_event_id=$2`,[channelId,webhookId]);
        receipt=existing.rows[0];
        if(!receipt)throw new IntegrationConflictError('Duplicate Shopify delivery could not be loaded');
        if(receipt.payload_sha256!==hash)throw new IntegrationConflictError('Same Shopify webhook id arrived with different payload evidence');
      }
    }catch(error:any){this.rethrow(error);}

    const last=await this.database.query<any>(`SELECT * FROM integrations.ingestion_attempts WHERE receipt_id=$1 ORDER BY attempt_number DESC LIMIT 1`,[receipt.id]);
    if((last.rows[0]?.outcome==='PROCESSED'||last.rows[0]?.outcome==='NOOP')&&!replay){
      const attempt=await this.recordAttempt(receipt.id,'NOOP',actor,{message:'Duplicate Shopify delivery already processed'});
      return{receipt,attempt,duplicate:true};
    }
    if(last.rows[0]?.outcome==='PROCESSED'&&replay){
      const attempt=await this.recordAttempt(receipt.id,'NOOP',actor,{message:'Replay skipped because delivery already processed'});
      return{receipt,attempt,duplicate:true};
    }

    try{
      const result=await this.database.transaction(async client=>{
        await client.query(`SELECT id FROM integrations.webhook_receipts WHERE id=$1 FOR UPDATE`,[receipt.id]);
        let entity:any;
        let normalizedEntityType:string;
        if(topic.startsWith('orders/')){
          const normalized=normalizeShopifyOrder(input.payload);
          const applied=await this.commerce.ingestOrder(actor,channelId,webhookId,normalized,client);
          entity=applied.order;normalizedEntityType='commerce.order';
        }else if(topic.startsWith('fulfillments/')){
          const normalized=normalizeShopifyFulfillment(input.payload,topic);
          const applied=await this.commerce.ingestFulfillment(actor,channelId,webhookId,normalized,client);
          entity=applied.fulfillment;normalizedEntityType='commerce.fulfillment';
        }else throw new IntegrationValidationError(`Unsupported Shopify commerce topic: ${topic}`);
        const attempt=await this.recordAttempt(receipt.id,'PROCESSED',actor,{normalizedEntityType,normalizedEntityId:entity.id,message:replay?'Replayed Shopify delivery':'Processed Shopify delivery'},client);
        await this.audit.record({actorUserId:actor.userId,action:replay?'integration.shopify_replayed':'integration.shopify_ingested',targetType:'integration.webhook_receipt',targetId:receipt.id,metadata:{channelId,webhookId,topic,shopDomain}},client);
        return{attempt,entity};
      });
      return{receipt,attempt:result.attempt,entity:result.entity,duplicate};
    }catch(error:any){
      const message=error instanceof Error?error.message:String(error);
      const attempt=await this.recordAttempt(receipt.id,'REJECTED',actor,{errorCode:error?.constructor?.name??'ERROR',message});
      if(error instanceof IntegrationValidationError||error instanceof IntegrationNotFoundError||error instanceof IntegrationConflictError||error instanceof PermissionDeniedError)throw error;
      throw new IntegrationConflictError(`${message} (attempt ${attempt.attempt_number})`);
    }
  }

  private async recordAttempt(receiptId:string,outcome:'PROCESSED'|'REJECTED'|'NOOP',actor:AuthContext,input:{normalizedEntityType?:string;normalizedEntityId?:string;errorCode?:string;message?:string},executor:QueryExecutor=this.database):Promise<any>{
    const next=await executor.query<{attempt_number:number}>(`SELECT COALESCE(max(attempt_number),0)::int+1 AS attempt_number FROM integrations.ingestion_attempts WHERE receipt_id=$1`,[receiptId]);
    const attemptNumber=next.rows[0]?.attempt_number??1;
    const result=await executor.query<any>(`INSERT INTO integrations.ingestion_attempts(receipt_id,attempt_number,outcome,normalized_entity_type,normalized_entity_id,error_code,message,actor_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[receiptId,attemptNumber,outcome,input.normalizedEntityType??null,input.normalizedEntityId??null,input.errorCode??null,input.message??'',actor.userId]);
    return result.rows[0];
  }

  private rethrow(error:any):never{
    if(error instanceof IntegrationValidationError||error instanceof IntegrationNotFoundError||error instanceof IntegrationConflictError)throw error;
    const message=String(error?.message??'');
    if(error?.code==='23503')throw new IntegrationNotFoundError('Referenced integration Channel or entity was not found');
    if(error?.code==='23505')throw new IntegrationConflictError(message);
    if(error?.code==='23514')throw new IntegrationValidationError(message);
    throw error;
  }
}
