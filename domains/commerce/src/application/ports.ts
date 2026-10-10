import type{QueryExecutor}from'@alsvid/database';import type{CreateChannelInput,NormalizedFulfillment,NormalizedOrder,OrderPartnerMappingInput,VariantMappingInput}from'../core/model.js';
export interface CommerceActor{userId:string;permissions:readonly string[]}
export interface CommerceAuditPort{record(input:{actorUserId:string;action:string;targetType:string;targetId:string;metadata?:Record<string,unknown>},executor?:QueryExecutor):Promise<void>}
export interface CommerceRepository{
 transaction<T>(work:(e:QueryExecutor)=>Promise<T>):Promise<T>;summary():Promise<any>;
 createChannel(input:CreateChannelInput&{channelKey:string;displayName:string;externalAccountId:string;actorUserId:string}):Promise<any>;
 mapVariant(input:VariantMappingInput&{externalVariantId:string;actorUserId:string},e:QueryExecutor):Promise<{mapping:any;affectedLines:number}>;
 mapOrderPartners(orderId:string,input:OrderPartnerMappingInput&{actorUserId:string},e:QueryExecutor):Promise<any|null>;
 mapFulfillmentShipment(id:string,shipmentId:string|null):Promise<any|null>;
 resolveException(id:string,input:{action:'RESOLVED'|'IGNORED';resolution:Record<string,unknown>;actorUserId:string},e:QueryExecutor):Promise<any|null>;
 ingestOrder(input:{channelId:string;providerEventId:string;order:NormalizedOrder;actorUserId:string},e:QueryExecutor):Promise<{order:any;applied:boolean}>;
 ingestFulfillment(input:{channelId:string;providerEventId:string;fulfillment:NormalizedFulfillment;actorUserId:string},e:QueryExecutor):Promise<{fulfillment:any;applied:boolean}>;
}
