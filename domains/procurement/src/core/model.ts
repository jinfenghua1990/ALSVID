export const ProcurementCapability={Read:'procurement.read',Write:'procurement.write',Issue:'procurement.issue',Confirm:'procurement.confirm',Receive:'procurement.receive'} as const;
export type ProcurementItemType='PART'|'SKU';
export type PurchaseOrderLineKind='PURCHASE'|'GIFT';
export type PurchaseOrderStatus='DRAFT'|'ISSUED'|'CONFIRMED'|'PARTIALLY_FULFILLED'|'FULFILLED'|'CANCELLED';
export type ReceiptKind='PHYSICAL_RECEIPT'|'FACTORY_COMMITMENT';
export interface ProcurementActor{userId:string;permissions:readonly string[]}
export interface ProcurementLineInput{lineKind?:PurchaseOrderLineKind;itemType:ProcurementItemType;itemId:string;quantity:string|number;unitPrice:string|number;unit?:string;supplierItemReference?:string;description?:string;requestedDate?:string}
export interface ConfirmationLineInput{purchaseOrderLineId:string;confirmedQuantity:string|number;confirmedDate?:string;note?:string}
export interface ReceiptLineInput{purchaseOrderLineId:string;quantity:string|number;unit?:string;note?:string}
