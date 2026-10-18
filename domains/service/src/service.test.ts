import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryExecutor } from '@alsvid/database';
import { ServiceCaseService } from './application/service-case-service.js';
import { ServiceCaseConflictError,ServiceCaseValidationError,ServiceCaseNotFoundError } from './core/errors.js';
import type { ServiceCase,ServiceCaseHistory,ServiceCaseStatus } from './core/model.js';
import type { ServiceCaseActor,ServiceCaseRepository,ServiceCaseAuditPort } from './application/ports.js';

const internal:ServiceCaseActor={userId:'11111111-1111-4111-8111-111111111111',roles:['internal_user','service_agent'],permissions:['service.read','service.write']};
const viewer:ServiceCaseActor={...internal,permissions:['service.read']};
const outside:ServiceCaseActor={...internal,roles:['dealer_user']};
const vehicleId='22222222-2222-4222-8222-222222222222';
const caseId='33333333-3333-4333-8333-333333333333';

function fixture() {
 let current:ServiceCase|null=null;
 const logs:ServiceCaseHistory[]=[];
 const audits:string[]=[];
 const executor={} as QueryExecutor;
 const repo:ServiceCaseRepository={
  transaction:async run=>run(executor),
  list:async()=>current?[current]:[],
  get:async()=>current,
  history:async()=>logs,
  vehicleExists:async id=>id===vehicleId,
  create:async(input,actor)=>{
   current={id:caseId,caseNumber:'SR-00000001',vehicleId:input.vehicleId,frameNumber:'FC1-001',sku:'FC1',
    category:input.category,title:input.title,description:input.description??'',status:'NEW',version:1,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'};
   assert.equal(actor,internal.userId);
   return current;
  },
  lockedCase:async()=>current,
  transition:async(_id,_version,_from,to)=>{
   if(!current)throw Error('missing');
   current={...current,status:to,version:current.version+1};
   return current;
  },
  recordHistory:async(row)=>{
   logs.push({id:String(logs.length+1),caseId:row.caseId,fromStatus:row.fromStatus,toStatus:row.toStatus,
    caseVersion:row.caseVersion,reason:row.reason,actorUserId:row.actorId,occurredAt:'2026-10-01T00:00:00Z'});
  },
 };
 const audit:ServiceCaseAuditPort={record:async row=>{audits.push(row.action);}};
 return {service:new ServiceCaseService(repo,audit),logs,audits};
}
const input={vehicleId,category:'ISSUE' as const,title:'刹车存在持续异响',description:'等待技术检查'};
test('internal agent creates service case with immutable first history and audit',async()=>{
 const f=fixture();
 const record=await f.service.create(internal,input);
 assert.equal(record.status,'NEW');
 assert.equal(record.vehicleId,vehicleId);
 assert.equal(f.logs[0]?.toStatus,'NEW');
 assert.equal(f.logs[0]?.caseVersion,1);
 assert.deepEqual(f.audits,['service.case_created']);
});
test('unverified or missing vehicles and malformed titles cannot create cases',async()=>{
 const f=fixture();
 await assert.rejects(f.service.create(internal,{...input,title:'x'}),ServiceCaseValidationError);
 await assert.rejects(f.service.create(internal,{...input,vehicleId:'44444444-4444-4444-8444-444444444444'}),ServiceCaseNotFoundError);
 assert.equal(f.logs.length,0);
});
test('transition preserves chronological history and rejects stale versions and illegal steps',async()=>{
 const f=fixture();
 await f.service.create(internal,input);
 await assert.rejects(f.service.transition(internal,caseId,{expectedVersion:1,toStatus:'CLOSED',reason:'跳过流程'}),ServiceCaseConflictError);
 const result=await f.service.transition(internal,caseId,{expectedVersion:1,toStatus:'TRIAGED',reason:'已经核验车辆故障'});
 assert.equal(result.version,2);
 assert.equal(f.logs.at(-1)?.fromStatus,'NEW');
 assert.equal(f.logs.at(-1)?.toStatus,'TRIAGED');
 assert.deepEqual(f.audits,['service.case_created','service.case_status_changed']);
 await assert.rejects(f.service.transition(internal,caseId,{expectedVersion:1,toStatus:'IN_PROGRESS',reason:'并发修改'}),ServiceCaseConflictError);
 await assert.rejects(f.service.transition(internal,caseId,{expectedVersion:2,toStatus:'IN_PROGRESS',reason:'x'}),ServiceCaseValidationError);
});
test('read-only and external role users cannot write or read restricted service cases',async()=>{
 const f=fixture();
 await assert.rejects(f.service.create(viewer,input),{code:'SERVICE_CASE_FORBIDDEN'});
 await assert.rejects(f.service.list(outside),{code:'SERVICE_CASE_INTERNAL_ONLY'});
 await assert.rejects(f.service.create(outside,input),{code:'SERVICE_CASE_INTERNAL_ONLY'});
});
test('resolved case can reopen; closed case is terminal',async()=>{
 const f=fixture();
 await f.service.create(internal,input);
 const steps:ServiceCaseStatus[]=['TRIAGED','IN_PROGRESS','RESOLVED','IN_PROGRESS','RESOLVED','CLOSED'];
 let version=1;
 for(const toStatus of steps){
  const row=await f.service.transition(internal,caseId,{expectedVersion:version,toStatus,reason:'真实处理流程记录'});
  version=row.version;
 }
 assert.equal(f.logs.length,7);
 await assert.rejects(f.service.transition(internal,caseId,{expectedVersion:version,toStatus:'IN_PROGRESS',reason:'尝试重启已关闭工单'}),ServiceCaseConflictError);
});
