export const InventoryCapability={Read:'inventory.read',Move:'inventory.move',Reserve:'inventory.reserve',Stocktake:'inventory.stocktake',Adjust:'inventory.adjust'} as const;
export type InventoryItemKind='PART'|'SKU'|'VEHICLE';
export type InventoryMovementType='RECEIPT'|'TRANSFER'|'ISSUE'|'RETURN'|'ADJUSTMENT'|'STOCKTAKE_CORRECTION';
export interface InventoryItemInput{itemKind:InventoryItemKind;itemId:string;unit:string}
export interface MovementInput extends InventoryItemInput{movementType:InventoryMovementType;quantity:string|number;sourceLocationId?:string;destinationLocationId?:string;reservationId?:string;referenceType?:string;referenceId?:string;reason?:string;idempotencyKey:string;correlationId?:string}
export interface ReservationInput extends InventoryItemInput{locationId:string;quantity:string|number;referenceType?:string;referenceId?:string;note?:string}
export interface ReservationIssueInput{idempotencyKey:string;reason?:string;referenceType?:string;referenceId?:string}
export interface InventoryItemIds{partId:string|null;skuId:string|null;vehicleId:string|null}
