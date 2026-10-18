import { ForbiddenError } from '@alsvid/kernel';
import { ServiceCaseCapabilities, type CreateServiceCaseInput, type ServiceCaseCategory, type ServiceCaseStatus, type TransitionServiceCaseInput, type RecordServiceActivityInput, type ServiceActivity, type ServiceActivityKind, type PreliminaryWarrantyAssessment } from '../core/model.js';
import { ServiceCaseConflictError, ServiceCaseNotFoundError, ServiceCaseValidationError } from '../core/errors.js';
import type { ServiceCaseActor, ServiceCaseAuditPort, ServiceCaseRepository } from './ports.js';

const categories: readonly ServiceCaseCategory[] = ['ISSUE','WARRANTY_REVIEW','REPAIR_REQUEST'];
const transitions: Readonly<Record<ServiceCaseStatus,readonly ServiceCaseStatus[]>> = {
 NEW: ['TRIAGED'],
 TRIAGED: ['IN_PROGRESS'],
 IN_PROGRESS: ['RESOLVED'],
 RESOLVED: ['IN_PROGRESS','CLOSED'],
 CLOSED: [],
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authorize(actor:ServiceCaseActor,permission:string):void {
 if (!actor.roles.some(role=>role==='system_admin'||role==='internal_user')) throw new ForbiddenError('SERVICE_CASE_INTERNAL_ONLY','Service cases are available only to authorized internal staff');
 if (!actor.permissions.includes(permission)) throw new ForbiddenError('SERVICE_CASE_FORBIDDEN','Missing permission: '+permission);
}
function validId(value:unknown):string {
 if(typeof value!=='string'||!uuidPattern.test(value)) throw new ServiceCaseValidationError('Valid UUID is required');
 return value;
}

export class ServiceCaseService {
 constructor(private readonly repo:ServiceCaseRepository,private readonly audit:ServiceCaseAuditPort){}
 async list(actor:ServiceCaseActor) { authorize(actor,ServiceCaseCapabilities.Read); return this.repo.list(); }
 async detail(actor:ServiceCaseActor,id:string) {
  authorize(actor,ServiceCaseCapabilities.Read);
  const caseId=validId(id);
  const record=await this.repo.get(caseId);
  if(!record)throw new ServiceCaseNotFoundError('Service case not found');
  return {case:record,history:await this.repo.history(caseId),activities:await this.repo.activities(caseId)};
 }
 async create(actor:ServiceCaseActor,input:CreateServiceCaseInput){
  authorize(actor,ServiceCaseCapabilities.Write);
  if(!input||typeof input!=='object')throw new ServiceCaseValidationError('Case details are required');
  const vehicleId=validId(input.vehicleId);
  if(!categories.includes(input.category))throw new ServiceCaseValidationError('Invalid service case category');
  const title=typeof input.title==='string'?input.title.trim():'';
  const description=typeof input.description==='string'?input.description.trim():'';
  if(title.length<5||title.length>160)throw new ServiceCaseValidationError('Title must contain 5-160 characters');
  if(description.length>4000)throw new ServiceCaseValidationError('Description must be at most 4000 characters');
  if(input.description!==undefined&&typeof input.description!=='string')throw new ServiceCaseValidationError('Description must be text');
  return this.repo.transaction(async e=>{
    if(!await this.repo.vehicleExists(vehicleId,e))throw new ServiceCaseNotFoundError('Vehicle not found; vehicle birth must be recorded first');
    const saved=await this.repo.create({vehicleId,category:input.category,title,description},actor.userId,e);
    await this.repo.recordHistory({caseId:saved.id,fromStatus:null,toStatus:'NEW',caseVersion:1,actorId:actor.userId,reason:'内部售后申请登记'},e);
    await this.audit.record({actorUserId:actor.userId,action:'service.case_created',targetType:'service_case',targetId:saved.id,metadata:{vehicleId,category:input.category}},e);
    return saved;
  });
 }
 async recordActivity(actor:ServiceCaseActor,id:string,input:RecordServiceActivityInput):Promise<ServiceActivity> {
  authorize(actor,ServiceCaseCapabilities.Write);
  const caseId=validId(id);
  if(!input||typeof input!=='object')throw new ServiceCaseValidationError('Activity details are required');
  const clientRequestId=validId(input.clientRequestId);
  const kinds:readonly ServiceActivityKind[]=['DIAGNOSIS','REPAIR_NOTE','WARRANTY_ASSESSMENT'];
  if(!kinds.includes(input.kind))throw new ServiceCaseValidationError('Invalid activity kind');
  if(input.kind==='WARRANTY_ASSESSMENT')authorize(actor,'service.warranty.review');
  const note=typeof input.note==='string'?input.note.trim():'';
  if(note.length<10||note.length>3000)throw new ServiceCaseValidationError('Activity note must be 10-3000 characters');
  const assessments:readonly PreliminaryWarrantyAssessment[]=['EVIDENCE_REQUIRED','POSSIBLY_COVERED','POSSIBLY_EXCLUDED'];
  if(input.kind==='REPAIR_NOTE'){
   if(!Number.isInteger(input.laborMinutes)||(input.laborMinutes??-1)<0||(input.laborMinutes??1441)>1440)throw new ServiceCaseValidationError('Labor minutes must be an integer between 0 and 1440');
   if(input.assessment!==undefined)throw new ServiceCaseValidationError('Repair notes cannot contain a warranty assessment');
  }else if(input.laborMinutes!==undefined){
   throw new ServiceCaseValidationError('Only repair notes can record labor minutes');
  }
  if(input.kind==='WARRANTY_ASSESSMENT'){
   if(!assessments.includes(input.assessment!))throw new ServiceCaseValidationError('Invalid preliminary warranty assessment');
  }else if(input.assessment!==undefined){
   throw new ServiceCaseValidationError('Only warranty reviews can contain preliminary assessments');
  }
  const normalized:RecordServiceActivityInput={
   clientRequestId,kind:input.kind,note,
   ...(input.kind==='REPAIR_NOTE'?{laborMinutes:input.laborMinutes!}:{}),
   ...(input.kind==='WARRANTY_ASSESSMENT'?{assessment:input.assessment!}:{}),
  };
  return this.repo.transaction(async e=>{
   // Serialize evidence submission against the case lifecycle and concurrent retries.
   const record=await this.repo.lockedCase(caseId,e);
   if(!record)throw new ServiceCaseNotFoundError('Service case not found');
   const existing=await this.repo.findActivityByRequest(caseId,clientRequestId,e);
   if(existing){
    if(existing.actorUserId!==actor.userId||existing.kind!==normalized.kind||existing.note!==note
       ||existing.laborMinutes!==(normalized.laborMinutes??null)||existing.assessment!==(normalized.assessment??null))
       throw new ServiceCaseConflictError('Idempotency key is already used for a different activity');
    return existing;
   }
   if(!['TRIAGED','IN_PROGRESS'].includes(record.status))
    throw new ServiceCaseConflictError('Case must be triaged or in progress before recording evidence');
   if(input.kind==='REPAIR_NOTE'&&record.status!=='IN_PROGRESS')
    throw new ServiceCaseConflictError('Repair labor can only be recorded while case is IN_PROGRESS');
   const created=await this.repo.createActivity(caseId,normalized,actor.userId,e);
   if(!created)throw new ServiceCaseConflictError('Activity already exists; reload case details');
   await this.audit.record({
    actorUserId:actor.userId,action:'service.case_activity_recorded',targetType:'service_case',
    targetId:caseId,metadata:{activityId:created.id,kind:created.kind,assessment:created.assessment},
   },e);
   return created;
  });
 }

 async transition(actor:ServiceCaseActor,id:string,input:TransitionServiceCaseInput){
  authorize(actor,ServiceCaseCapabilities.Write);
  const caseId=validId(id);
  if(!input||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1)throw new ServiceCaseValidationError('expectedVersion is required');
  const reason=typeof input.reason==='string'?input.reason.trim():'';
  if(reason.length<3||reason.length>1000)throw new ServiceCaseValidationError('Reason must contain 3-1000 characters');
  return this.repo.transaction(async e=>{
    const before=await this.repo.lockedCase(caseId,e);
    if(!before)throw new ServiceCaseNotFoundError('Service case not found');
    if(before.version!==input.expectedVersion)throw new ServiceCaseConflictError('Service case was changed; refresh before updating');
    if(!transitions[before.status].includes(input.toStatus))throw new ServiceCaseConflictError('Invalid case transition: '+before.status+' -> '+String(input.toStatus));
    const saved=await this.repo.transition(caseId,before.version,before.status,input.toStatus,actor.userId,e);
    await this.repo.recordHistory({caseId,fromStatus:before.status,toStatus:input.toStatus,caseVersion:saved.version,actorId:actor.userId,reason},e);
    await this.audit.record({actorUserId:actor.userId,action:'service.case_status_changed',targetType:'service_case',targetId:caseId,metadata:{fromStatus:before.status,toStatus:input.toStatus,reason,version:saved.version}},e);
    return saved;
  });
 }
}
