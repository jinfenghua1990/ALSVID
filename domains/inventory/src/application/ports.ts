import type{QueryExecutor}from'@alsvid/database';import type{InventoryItemIds,InventoryItemKind,MovementInput,ReservationInput}from'../core/model.js';
export interface InventoryActor{userId:string;permissions:readonly string[]}
export interface InventoryAuditPort{record(input:{actorUserId:string;action:string;targetType:string;targetId:string;correlationId?:string|null;metadata?:Record<string,unknown>},executor?:QueryExecutor):Promise<void>}
export interface InventoryRepository{
 transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;summary():Promise<any>;
 itemUnit(kind:InventoryItemKind,id:string,executor?:QueryExecutor):Promise<string|null>;
 createReservation(input:ReservationInput&InventoryItemIds&{quantity:string;unit:string;actorUserId:string},executor?:QueryExecutor):Promise<any>;
 releaseReservation(id:string,userId:string,executor?:QueryExecutor):Promise<any|null>;lockReservation(id:string,executor:QueryExecutor):Promise<any|null>;
 insertMovement(input:MovementInput&InventoryItemIds&{quantity:string;unit:string;actorUserId:string},executor?:QueryExecutor):Promise<any>;
 balanceAt(input:{itemKind:InventoryItemKind;ids:InventoryItemIds;locationId:string;unit:string},executor?:QueryExecutor):Promise<string>;
}
