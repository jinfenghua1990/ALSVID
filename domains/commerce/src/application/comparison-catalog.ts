import { ForbiddenError } from '@alsvid/kernel';
import { postgresErrorCode, type QueryExecutor } from '@alsvid/database';
import { CommerceConflictError, CommerceNotFoundError } from '../core/errors.js';
import { comparisonCreate, comparisonUpdate, comparisonId, comparisonList,
  type ComparisonCatalogProduct, type ComparisonCreateInput, type ComparisonUpdateInput,
  type ComparisonProductPage, type ComparisonListQuery } from '../core/comparison-catalog.js';
import type { CommerceActor, CommerceAuditPort } from './ports.js';
export interface ComparisonActor extends CommerceActor { roles: readonly string[] }
export interface ComparisonCatalogRepository {
  transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>;
  list(query:ComparisonListQuery,publishedOnly:boolean):Promise<ComparisonProductPage>;
  get(id:string,publishedOnly:boolean):Promise<ComparisonCatalogProduct|null>;
  create(input:ComparisonCreateInput,actorUserId:string,executor:QueryExecutor):Promise<ComparisonCatalogProduct>;
  update(id:string,input:ComparisonUpdateInput,actorUserId:string,executor:QueryExecutor):Promise<ComparisonCatalogProduct|null>;
}
function permission(actor:ComparisonActor,write:boolean):void {
  const required = write ? 'commerce.map' : 'commerce.read';
  if (!actor.roles.includes('system_admin') || !actor.permissions.includes(required))
    throw new ForbiddenError('COMMERCE_LAB_FORBIDDEN','Internal Admin comparison permission is required');
}
export class ComparisonCatalogService {
  constructor(private readonly repository:ComparisonCatalogRepository,private readonly audit:CommerceAuditPort) {}
  async adminList(actor:ComparisonActor,query:{page?:unknown;limit?:unknown;query?:unknown}={}):Promise<ComparisonProductPage> {
    permission(actor,false);return this.repository.list(comparisonList(query),false);
  }
  async adminProduct(actor:ComparisonActor,id:string):Promise<ComparisonCatalogProduct> {
    permission(actor,false);
    const row=await this.repository.get(comparisonId(id),false);
    if(!row)throw new CommerceNotFoundError('Comparison product not found');
    return row;
  }
  async publicList(query:{page?:unknown;limit?:unknown;query?:unknown}={}):Promise<ComparisonProductPage> {
    return this.repository.list(comparisonList(query),true);
  }
  async publicProduct(id:string):Promise<ComparisonCatalogProduct> {
    const row=await this.repository.get(comparisonId(id),true);
    if(!row)throw new CommerceNotFoundError('Published comparison product not found');
    return row;
  }
  async create(actor:ComparisonActor,value:unknown):Promise<ComparisonCatalogProduct> {
    permission(actor,true);const input=comparisonCreate(value);
    try{return await this.repository.transaction(async executor=>{
      const row=await this.repository.create(input,actor.userId,executor);
      await this.audit.record({actorUserId:actor.userId,action:'commerce.lab.product_created',
        targetType:'commerce_lab.catalog_product',targetId:row.id,metadata:{code:row.code,version:row.version}},executor);
      return row;
    });}catch(error){if(postgresErrorCode(error)==='23505')throw new CommerceConflictError('Comparison product code already exists');throw error;}
  }
  async update(actor:ComparisonActor,id:string,value:unknown):Promise<ComparisonCatalogProduct> {
    permission(actor,true);comparisonId(id);const input=comparisonUpdate(value);
    return this.repository.transaction(async executor=>{
      const row=await this.repository.update(id,input,actor.userId,executor);
      if(!row)throw new CommerceConflictError('Comparison product changed or no longer exists. Reload before saving.');
      await this.audit.record({actorUserId:actor.userId,action:'commerce.lab.product_updated',
        targetType:'commerce_lab.catalog_product',targetId:row.id,
        metadata:{status:row.status,version:row.version,previousVersion:input.expectedVersion}},executor);
      return row;
    });
  }
}
