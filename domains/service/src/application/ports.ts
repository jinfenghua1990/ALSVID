import type { QueryExecutor } from '@alsvid/database';
import type { CreateServiceCaseInput, ServiceCase, ServiceCaseHistory, ServiceCaseStatus, ServiceCaseCategory, OwnerServiceCase, ServiceActivity, RecordServiceActivityInput } from '../core/model.js';

export interface ServiceCaseActor { userId: string; roles: readonly string[]; permissions: readonly string[] }
export interface ServiceCaseAuditPort {
 record(input: { actorUserId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> },executor?:QueryExecutor):Promise<void>;
}
export interface ServiceCaseRepository {
 transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;
 list():Promise<ServiceCase[]>;
 get(id:string,executor?:QueryExecutor):Promise<ServiceCase|null>;
 history(caseId:string):Promise<ServiceCaseHistory[]>;
 activities(caseId:string):Promise<ServiceActivity[]>;
 ownerCases(userId:string):Promise<OwnerServiceCase[]>;
 vehicleExists(vehicleId:string,executor:QueryExecutor):Promise<boolean>;
  ownerVehicleAccessible(userId:string,vehicleId:string,executor:QueryExecutor):Promise<boolean>;
  findOwnerSubmission(userId:string,clientRequestId:string,executor:QueryExecutor):Promise<{vehicleId:string;caseId:string;category:ServiceCaseCategory;title:string;description:string}|null>;
  recordOwnerSubmission(userId:string,clientRequestId:string,vehicleId:string,caseId:string,payload:{category:ServiceCaseCategory;title:string;description:string},executor:QueryExecutor):Promise<void>;
 create(input:CreateServiceCaseInput,actorId:string,executor:QueryExecutor):Promise<ServiceCase>;
 lockedCase(id:string,executor:QueryExecutor):Promise<ServiceCase|null>;
 transition(id:string,expectedVersion:number,fromStatus:ServiceCaseStatus,toStatus:ServiceCaseStatus,actorId:string,executor:QueryExecutor):Promise<ServiceCase>;
 findActivityByRequest(caseId:string,requestId:string,executor:QueryExecutor):Promise<ServiceActivity|null>;
 createActivity(caseId:string,input:RecordServiceActivityInput,actorId:string,executor:QueryExecutor):Promise<ServiceActivity|null>;
 recordHistory(input:{caseId:string;fromStatus:ServiceCaseStatus|null;toStatus:ServiceCaseStatus;caseVersion:number;actorId:string;reason:string},executor:QueryExecutor):Promise<void>;
}
