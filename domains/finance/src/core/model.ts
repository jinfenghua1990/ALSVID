export const FinanceCapability={Read:'finance.read',DocumentWrite:'finance.document.write',DocumentPost:'finance.document.post',PaymentWrite:'finance.payment.write',Allocate:'finance.allocate',Reconcile:'finance.reconcile',LandedCost:'finance.landed_cost'} as const;
export type FinanceDocumentType='SUPPLIER_INVOICE'|'CUSTOMER_INVOICE'|'SUPPLIER_CREDIT_NOTE'|'CUSTOMER_CREDIT_NOTE'|'DEBIT_NOTE'|'OTHER';
export type FinanceSourceType='PROCUREMENT_PO'|'COMMERCE_ORDER'|'LOGISTICS_SHIPMENT'|'MANUAL';
export type FinanceDirection='AR'|'AP';
export type PaymentDirection='INBOUND'|'OUTBOUND';
export type LandedCostCategory='GOODS'|'FREIGHT'|'INSURANCE'|'DUTY'|'IMPORT_VAT'|'ANTI_DUMPING'|'COUNTERVAILING'|'OPERATIONAL_FEE'|'OTHER';
export type FinanceLineCategory=LandedCostCategory|'SERVICE';
export type LandedCostBasis='QUANTITY'|'VALUE'|'WEIGHT'|'MANUAL';
export interface FinanceDocumentLineInput{category:FinanceLineCategory;description?:string;quantity?:string|number;unit?:string;unitPrice?:string|number;netAmount:string|number;taxAmount?:string|number;skuId?:string;shipmentId?:string;metadata?:Record<string,unknown>}
export interface CreateFinanceDocumentInput{documentType:FinanceDocumentType;partnerId:string;externalReference?:string;currency:string;issueDate:string;dueDate?:string;sourceType?:FinanceSourceType;sourceId?:string;note?:string;lines?:FinanceDocumentLineInput[]}
export interface CreateObligationInput{direction:FinanceDirection;partnerId:string;currency:string;amount:string|number;dueDate?:string;sourceType?:FinanceSourceType;sourceId?:string;note?:string}
export interface CreatePaymentInput{direction:PaymentDirection;partnerId?:string;currency:string;amount:string|number;valueDate:string;provider?:string;accountReference?:string;externalReference?:string;idempotencyKey:string;note?:string}
export interface CreateFxRateInput{baseCurrency:string;quoteCurrency:string;rate:string|number;effectiveAt:string;source:string;externalReference?:string}
export interface AllocatePaymentInput{paymentId:string;obligationId:string;paymentAmount:string|number;obligationAmount:string|number;fxRateId?:string;note?:string}
export interface CreateLandedCostBatchInput{shipmentId:string;currency:string;allocationBasis:LandedCostBasis;note?:string}
export interface AddLandedCostComponentInput{category:LandedCostCategory;amount:string|number;currency:string;batchCurrencyAmount:string|number;fxRateId?:string;sourceDocumentId?:string;sourceCustomsLineId?:string;capitalizable?:boolean;note?:string}
export interface AllocateLandedCostInput{cargoId:string;allocatedAmount:string|number;basisValue?:string|number}
