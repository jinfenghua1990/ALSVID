import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import type { CreateServiceCaseInput, ServiceCase, ServiceCaseHistory, ServiceCaseStatus } from '../core/model.js';
import { ServiceCaseConflictError } from '../core/errors.js';
import type { ServiceCaseRepository } from '../application/ports.js';

type CaseRow = {
 id:string;case_number:string;vehicle_id:string;frame_number:string;sku:string;
 category:ServiceCase['category'];title:string;description:string;status:ServiceCaseStatus;
 version:number;created_at:Date;updated_at:Date;
};
type HistoryRow = {
 id:string;case_id:string;from_status:ServiceCaseStatus|null;to_status:ServiceCaseStatus;
 case_version:number;actor_user_id:string;reason:string;occurred_at:Date;
};
const selectCases = 'SELECT c.*,v.frame_number,s.sku FROM service.cases c JOIN vehicle.vehicles v ON v.id=c.vehicle_id JOIN product.skus s ON s.id=v.sku_id';
function mapCase(row:CaseRow):ServiceCase {
 return {
  id:row.id,caseNumber:row.case_number,vehicleId:row.vehicle_id,
  frameNumber:row.frame_number,sku:row.sku,category:row.category,
  title:row.title,description:row.description,status:row.status,
  version:row.version,createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString()
 };
}
export class PostgresServiceCaseRepository implements ServiceCaseRepository {
 constructor(private readonly db:DatabasePort){}
 transaction<T>(fn:(e:QueryExecutor)=>Promise<T>):Promise<T>{return this.db.transaction(fn);}
 async list():Promise<ServiceCase[]>{
  const r=await this.db.query<CaseRow>(selectCases+' ORDER BY c.created_at DESC,c.id DESC LIMIT 200');
  return r.rows.map(mapCase);
 }
 async get(id:string,e:QueryExecutor=this.db):Promise<ServiceCase|null>{
  const r=await e.query<CaseRow>(selectCases+' WHERE c.id=$1',[id]);
  return r.rows[0]?mapCase(r.rows[0]):null;
 }
 async history(caseId:string):Promise<ServiceCaseHistory[]>{
  const r=await this.db.query<HistoryRow>(
   'SELECT id,case_id,from_status,to_status,case_version,actor_user_id,reason,occurred_at FROM service.case_history WHERE case_id=$1 ORDER BY case_version ASC',[caseId]);
  return r.rows.map(row=>({id:row.id,caseId:row.case_id,fromStatus:row.from_status,toStatus:row.to_status,caseVersion:row.case_version,actorUserId:row.actor_user_id,reason:row.reason,occurredAt:row.occurred_at.toISOString()}));
 }
 async vehicleExists(vehicleId:string,e:QueryExecutor):Promise<boolean>{
  const r=await e.query('SELECT id FROM vehicle.vehicles WHERE id=$1',[vehicleId]);
  return r.rowCount!==null&&r.rowCount>0;
 }
 async create(input:CreateServiceCaseInput,actorId:string,e:QueryExecutor):Promise<ServiceCase>{
  const r=await e.query<{id:string}>('INSERT INTO service.cases(vehicle_id,category,title,description,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$5) RETURNING id',
   [input.vehicleId,input.category,input.title,input.description??'',actorId]);
  const row=r.rows[0];
  if(!row)throw new Error('Service case creation returned no identity');
  const saved=await this.get(row.id,e);
  if(!saved)throw new Error('Service case missing immediately after creation');
  return saved;
 }
 async lockedCase(id:string,e:QueryExecutor):Promise<ServiceCase|null>{
  const r=await e.query<CaseRow>(selectCases+' WHERE c.id=$1 FOR UPDATE OF c',[id]);
  return r.rows[0]?mapCase(r.rows[0]):null;
 }
 async transition(id:string,expectedVersion:number,fromStatus:ServiceCaseStatus,toStatus:ServiceCaseStatus,actorId:string,e:QueryExecutor):Promise<ServiceCase>{
  const r=await e.query<{id:string}>(
   'UPDATE service.cases SET status=$4,version=version+1,updated_by=$5,updated_at=now() WHERE id=$1 AND version=$2 AND status=$3 RETURNING id',
   [id,expectedVersion,fromStatus,toStatus,actorId]);
  if(r.rowCount!==1)throw new ServiceCaseConflictError('Service case changed; reload and retry');
  const saved=await this.get(id,e);
  if(!saved)throw new Error('Updated service case missing');
  return saved;
 }
 async recordHistory(input:{caseId:string;fromStatus:ServiceCaseStatus|null;toStatus:ServiceCaseStatus;caseVersion:number;actorId:string;reason:string},e:QueryExecutor):Promise<void>{
  await e.query('INSERT INTO service.case_history(case_id,from_status,to_status,case_version,actor_user_id,reason) VALUES($1,$2,$3,$4,$5,$6)',
    [input.caseId,input.fromStatus,input.toStatus,input.caseVersion,input.actorId,input.reason]);
 }
}
