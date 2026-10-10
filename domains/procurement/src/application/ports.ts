import type{QueryExecutor}from'@alsvid/database';import type{ProcurementLineInput,PurchaseOrderStatus}from'../core/model.js';
export interface ProcurementAuditPort{record(input:{actorUserId:string;action:string;targetType:string;targetId:string;metadata?:Record<string,unknown>},executor?:QueryExecutor):Promise<void>}
export interface ProcurementRepository{
 transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;
 summary():Promise<any>;
 createQuotationHeader(input:any,executor:QueryExecutor):Promise<string>;insertQuotationLine(quotationId:string,lineNo:number,input:ProcurementLineInput,executor:QueryExecutor):Promise<void>;findQuotation(id:string,executor?:QueryExecutor):Promise<any|null>;setQuotationStatus(id:string,status:string,userId:string):Promise<any|null>;
 createPurchaseOrderHeader(input:any,executor:QueryExecutor):Promise<string>;insertPurchaseOrderLine(poId:string,lineNo:number,input:ProcurementLineInput,executor:QueryExecutor):Promise<void>;findPurchaseOrder(id:string,executor?:QueryExecutor):Promise<any|null>;issuePurchaseOrder(id:string,userId:string):Promise<any|null>;
 lockPurchaseOrder(id:string,executor:QueryExecutor):Promise<{id:string;status:PurchaseOrderStatus}|null>;createConfirmation(poId:string,input:any,userId:string,executor:QueryExecutor):Promise<string>;insertConfirmationLine(confirmationId:string,input:any,executor:QueryExecutor):Promise<void>;markConfirmed(poId:string,userId:string,executor:QueryExecutor):Promise<any>;
 createReceipt(poId:string,input:any,userId:string,executor:QueryExecutor):Promise<string>;insertReceiptLine(receiptId:string,input:any,executor:QueryExecutor):Promise<void>;fulfillment(poId:string,executor:QueryExecutor):Promise<{totalLines:number;fulfilledLines:number;receivedLines:number}>;setPurchaseOrderStatus(poId:string,status:PurchaseOrderStatus,userId:string,executor:QueryExecutor):Promise<void>;
}
