import type { QueryExecutor } from '@alsvid/database';
import type { CreateServiceCaseInput, ServiceCase, ServiceCaseHistory, ServiceCaseStatus } from '../core/model.js';

export interface ServiceCaseActor { userId: string; roles: readonly string[]; permissions: readonly string[] }
export interface ServiceCaseAuditPort {
 record(input: { actorUserId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> },executor?:QueryExecutor):Promise<void>;
}
export interface ServiceCaseRepository {
 transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;
 list():Promise<ServiceCase[]>;
 get(id:string,executor?:QueryExecutor):Promise<ServiceCase|null>;
 history(caseId:string):Promise<ServiceCaseHistory[]>;
 vehicleExists(vehicleId:string,executor:QueryExecutor):Promise<boolean>;
 create(input:CreateServiceCaseInput,actorId:string,executor:QueryExecutor):Promise<ServiceCase>;
 lockedCase(id:string,executor:QueryExecutor):Promise<ServiceCase|null>;
 transition(id:string,expectedVersion:number,fromStatus:ServiceCaseStatus,toStatus:ServiceCaseStatus,actorId:string,executor:QueryExecutor):Promise<ServiceCase>;
 recordHistory(input:{caseId:string;fromStatus:ServiceCaseStatus|null;toStatus:ServiceCaseStatus;caseVersion:number;actorId:string;reason:string},executor:QueryExecutor):Promise<void>;
}
