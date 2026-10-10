import type { QueryExecutor } from '@alsvid/database';
import type { AddLandedCostComponentInput, AllocateLandedCostInput, AllocatePaymentInput, CreateFinanceDocumentInput, CreateFxRateInput, CreateLandedCostBatchInput, CreateObligationInput, CreatePaymentInput, FinanceDocumentLineInput, FinanceSourceType } from '../core/model.js';
export interface FinanceActor{userId:string;permissions:string[]}
export interface FinanceAuditPort{record(input:{actorUserId?:string|null;action:string;targetType:string;targetId?:string|null;metadata?:Record<string,unknown>},executor?:QueryExecutor):Promise<void>}
export interface FinanceRepository{
  summary():Promise<any>;
  transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;
  createDocument(input:CreateFinanceDocumentInput&{currency:string;sourceType:FinanceSourceType;sourceId:string|null;actorUserId:string},executor:QueryExecutor):Promise<any>;
  addDocumentLine(documentId:string,lineNo:number,input:FinanceDocumentLineInput&{quantity:string;unit:string;unitPrice:string;netAmount:string;taxAmount:string},executor:QueryExecutor):Promise<void>;
  refreshDocumentTotals(documentId:string,executor:QueryExecutor):Promise<any>;
  transitionDocument(documentId:string,expectedVersion:number,status:'VERIFIED'|'DRAFT',actorUserId:string):Promise<any|null>;
  voidDocument(documentId:string,expectedVersion:number,reason:string,actorUserId:string):Promise<any|null>;
  lockDocument(documentId:string,executor:QueryExecutor):Promise<any|null>;
  postDocument(documentId:string,expectedVersion:number,actorUserId:string,executor:QueryExecutor):Promise<any|null>;
  createObligation(input:CreateObligationInput&{currency:string;amount:string;sourceType:FinanceSourceType;sourceId:string|null;actorUserId:string;documentId?:string|null},executor?:QueryExecutor):Promise<any>;
  voidObligation(obligationId:string,reason:string,actorUserId:string):Promise<any>;
  createPayment(input:CreatePaymentInput&{currency:string;amount:string;actorUserId:string}):Promise<any>;
  reversePayment(paymentId:string,reason:string,actorUserId:string):Promise<any>;
  createFxRate(input:CreateFxRateInput&{baseCurrency:string;quoteCurrency:string;rate:string;actorUserId:string}):Promise<any>;
  allocatePayment(input:AllocatePaymentInput&{paymentAmount:string;obligationAmount:string;actorUserId:string}):Promise<any>;
  reverseAllocation(allocationId:string,reason:string,actorUserId:string):Promise<any>;
  createLandedCostBatch(input:CreateLandedCostBatchInput&{currency:string;actorUserId:string}):Promise<any>;
  addLandedCostComponent(batchId:string,input:AddLandedCostComponentInput&{amount:string;currency:string;batchCurrencyAmount:string;actorUserId:string}):Promise<any>;
  allocateLandedCost(componentId:string,input:AllocateLandedCostInput&{allocatedAmount:string;basisValue:string|null;actorUserId:string}):Promise<any>;
  finalizeLandedCostBatch(batchId:string,actorUserId:string):Promise<any|null>;
}
