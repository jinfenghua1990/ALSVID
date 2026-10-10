import type { AuditService } from '@alsvid/audit';
import type { Database } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const DealerCapability={Read:'dealer.read',Write:'dealer.write'} as const;
export type DealerStatus='PROSPECT'|'ACTIVE'|'SUSPENDED'|'CLOSED';
export class DealerValidationError extends Error{}
export class DealerNotFoundError extends Error{}
export class DealerConflictError extends Error{}

function requireCapability(actor:AuthContext,permission:string){if(!actor.permissions.includes(permission))throw new PermissionDeniedError(permission);}
function countries(values:string[]|undefined):string[]{return [...new Set((values??[]).map(value=>value.trim().toUpperCase()).filter(Boolean))];}

export class DealerService{
  constructor(private readonly database:Database,private readonly audit:AuditService){}

  async summary(actor:AuthContext):Promise<any>{
    requireCapability(actor,DealerCapability.Read);
    const [dealers,history]=await Promise.all([
      this.database.query<any>(`SELECT d.*,p.partner_code,p.display_name,p.country_code,
        a.line1 AS default_shipping_line1,a.city AS default_shipping_city,a.country_code AS default_shipping_country,
        c.type AS default_contact_type,c.value AS default_contact_value,c.purpose AS default_contact_purpose,
        l.code AS default_inventory_location_code,w.code AS default_inventory_warehouse_code
        FROM dealer.dealers d JOIN partners.partners p ON p.id=d.partner_id
        LEFT JOIN partners.addresses a ON a.id=d.default_shipping_address_id
        LEFT JOIN partners.contacts c ON c.id=d.default_contact_id
        LEFT JOIN warehouse.locations l ON l.id=d.default_inventory_location_id LEFT JOIN warehouse.warehouses w ON w.id=l.warehouse_id
        ORDER BY d.created_at DESC`),
      this.database.query<any>(`SELECT h.*,p.display_name FROM dealer.status_history h JOIN dealer.dealers d ON d.id=h.dealer_id JOIN partners.partners p ON p.id=d.partner_id ORDER BY h.occurred_at DESC,h.id DESC LIMIT 1000`),
    ]);
    return{dealers:dealers.rows,history:history.rows};
  }

  async create(actor:AuthContext,input:{partnerId:string;status?:DealerStatus;marketCountries?:string[];salesEnabled?:boolean;serviceEnabled?:boolean;defaultShippingAddressId?:string;defaultContactId?:string;defaultInventoryLocationId?:string;note?:string}):Promise<any>{
    requireCapability(actor,DealerCapability.Write);
    if(!input.partnerId)throw new DealerValidationError('partnerId is required');
    try{
      const result=await this.database.query<any>(`INSERT INTO dealer.dealers(partner_id,status,market_countries,sales_enabled,service_enabled,default_shipping_address_id,default_contact_id,default_inventory_location_id,note,created_by,updated_by)
        VALUES ($1,$2,$3::text[],$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,[input.partnerId,input.status??'PROSPECT',countries(input.marketCountries),input.salesEnabled??true,input.serviceEnabled??false,input.defaultShippingAddressId||null,input.defaultContactId||null,input.defaultInventoryLocationId||null,input.note?.trim()??'',actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'dealer.profile_created',targetType:'dealer',targetId:result.rows[0].id,metadata:{partnerId:input.partnerId,status:result.rows[0].status}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async update(actor:AuthContext,dealerId:string,input:{expectedVersion:number;marketCountries?:string[];salesEnabled?:boolean;serviceEnabled?:boolean;defaultShippingAddressId?:string|null;defaultContactId?:string|null;defaultInventoryLocationId?:string|null;note?:string}):Promise<any>{
    requireCapability(actor,DealerCapability.Write);
    if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new DealerValidationError('expectedVersion is required');
    try{
      const result=await this.database.query<any>(`UPDATE dealer.dealers SET
        market_countries=COALESCE($3::text[],market_countries),sales_enabled=COALESCE($4,sales_enabled),service_enabled=COALESCE($5,service_enabled),
        default_shipping_address_id=CASE WHEN $6::boolean THEN $7::uuid ELSE default_shipping_address_id END,
        default_contact_id=CASE WHEN $8::boolean THEN $9::uuid ELSE default_contact_id END,
        default_inventory_location_id=CASE WHEN $10::boolean THEN $11::uuid ELSE default_inventory_location_id END,
        note=COALESCE($12,note),version=version+1,updated_by=$13,updated_at=now()
        WHERE id=$1 AND version=$2 RETURNING *`,[dealerId,input.expectedVersion,input.marketCountries===undefined?null:countries(input.marketCountries),input.salesEnabled??null,input.serviceEnabled??null,input.defaultShippingAddressId!==undefined,input.defaultShippingAddressId??null,input.defaultContactId!==undefined,input.defaultContactId??null,input.defaultInventoryLocationId!==undefined,input.defaultInventoryLocationId??null,input.note===undefined?null:input.note.trim(),actor.userId]);
      if(!result.rows[0]){const exists=await this.database.query(`SELECT 1 FROM dealer.dealers WHERE id=$1`,[dealerId]);if(!exists.rows[0])throw new DealerNotFoundError('Dealer profile not found');throw new DealerConflictError('Dealer profile changed; reload before editing');}
      await this.audit.record({actorUserId:actor.userId,action:'dealer.profile_updated',targetType:'dealer',targetId:dealerId,metadata:{version:result.rows[0].version}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async changeStatus(actor:AuthContext,dealerId:string,input:{expectedVersion:number;status:DealerStatus;reason?:string}):Promise<any>{
    requireCapability(actor,DealerCapability.Write);
    if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw new DealerValidationError('expectedVersion is required');
    if(!['PROSPECT','ACTIVE','SUSPENDED','CLOSED'].includes(input.status))throw new DealerValidationError('Invalid Dealer status');
    try{
      return await this.database.transaction(async client=>{
        const current=await client.query<any>(`SELECT * FROM dealer.dealers WHERE id=$1 FOR UPDATE`,[dealerId]);
        if(!current.rows[0])throw new DealerNotFoundError('Dealer profile not found');
        if(current.rows[0].version!==input.expectedVersion)throw new DealerConflictError('Dealer profile changed; reload before changing status');
        if(current.rows[0].status===input.status)return current.rows[0];
        const result=await client.query<any>(`UPDATE dealer.dealers SET status=$3,version=version+1,updated_by=$4,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *`,[dealerId,input.expectedVersion,input.status,actor.userId]);
        if(!result.rows[0])throw new DealerConflictError('Dealer profile changed; reload before changing status');
        await client.query(`INSERT INTO dealer.status_history(dealer_id,from_status,to_status,dealer_version,reason,changed_by) VALUES ($1,$2,$3,$4,$5,$6)`,[dealerId,current.rows[0].status,input.status,result.rows[0].version,input.reason?.trim()??'',actor.userId]);
        await this.audit.record({actorUserId:actor.userId,action:'dealer.status_changed',targetType:'dealer',targetId:dealerId,metadata:{fromStatus:current.rows[0].status,status:input.status,reason:input.reason?.trim()??'',version:result.rows[0].version}},client);
        return result.rows[0];
      });
    }catch(error:any){this.rethrow(error);}
  }

  private rethrow(error:any):never{
    if(error instanceof DealerValidationError||error instanceof DealerNotFoundError||error instanceof DealerConflictError)throw error;
    const message=String(error?.message??'');
    if(error?.code==='23503')throw new DealerNotFoundError('Referenced Partner, address, contact or Inventory location not found');
    if(error?.code==='23505')throw new DealerConflictError('Dealer profile already exists for this Partner');
    if(error?.code==='23514')throw new DealerValidationError(message);
    if(/requires enabled DEALER|must belong|Invalid Dealer transition/i.test(message))throw new DealerConflictError(message);
    throw error;
  }
}
