import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';
import { InventoryCapability, type InventoryItemKind, type InventoryService } from '@alsvid/inventory';

export const WarehouseCapability = {
  Manage: 'warehouse.manage',
  Stocktake: InventoryCapability.Stocktake,
  Read: InventoryCapability.Read,
} as const;

export class WarehouseValidationError extends Error {}
export class WarehouseNotFoundError extends Error {}
export class WarehouseConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

function code(value: string, name: string): string {
  const normalized = value.trim().toUpperCase();
  if (!normalized) throw new WarehouseValidationError(`${name} is required`);
  return normalized;
}

function country(value: string): string {
  const normalized=value.trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(normalized)) throw new WarehouseValidationError('countryCode must be ISO alpha-2');
  return normalized;
}

export class WarehouseService {
  constructor(private readonly database: Database, private readonly audit: AuditService, private readonly inventory: InventoryService) {}

  async summary(actor: AuthContext): Promise<any> {
    requireCapability(actor, WarehouseCapability.Read);
    const [warehouses,locations,stocktakes,counts]=await Promise.all([
      this.database.query<any>(`SELECT w.*,p.partner_code,p.display_name AS partner_name FROM warehouse.warehouses w LEFT JOIN partners.partners p ON p.id=w.partner_id ORDER BY w.code`),
      this.database.query<any>(`SELECT l.*,w.code AS warehouse_code,w.name AS warehouse_name,pl.code AS parent_code FROM warehouse.locations l JOIN warehouse.warehouses w ON w.id=l.warehouse_id LEFT JOIN warehouse.locations pl ON pl.id=l.parent_location_id ORDER BY w.code,l.code`),
      this.database.query<any>(`SELECT s.*,w.code AS warehouse_code,w.name AS warehouse_name FROM warehouse.stocktake_sessions s JOIN warehouse.warehouses w ON w.id=s.warehouse_id ORDER BY s.opened_at DESC LIMIT 200`),
      this.database.query<any>(`SELECT c.*,l.code AS location_code,p.part_number,s.sku,v.frame_number FROM warehouse.stocktake_counts c JOIN warehouse.locations l ON l.id=c.location_id LEFT JOIN engineering.parts p ON p.id=c.part_id LEFT JOIN product.skus s ON s.id=c.sku_id LEFT JOIN vehicle.vehicles v ON v.id=c.vehicle_id ORDER BY c.counted_at DESC LIMIT 1000`),
    ]);
    return {warehouses:warehouses.rows,locations:locations.rows,stocktakes:stocktakes.rows,counts:counts.rows};
  }

  async createWarehouse(actor: AuthContext,input:{code:string;name:string;partnerId?:string;countryCode:string;timezone?:string}):Promise<any>{
    requireCapability(actor,WarehouseCapability.Manage);
    if(!input.name?.trim()) throw new WarehouseValidationError('name is required');
    try{
      const result=await this.database.query<any>(`INSERT INTO warehouse.warehouses(code,name,partner_id,country_code,timezone,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,[code(input.code,'code'),input.name.trim(),input.partnerId||null,country(input.countryCode),input.timezone?.trim()||'UTC',actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'warehouse.created',targetType:'warehouse',targetId:result.rows[0].id});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async createLocation(actor:AuthContext,input:{warehouseId:string;parentLocationId?:string;code:string;name:string;locationType:string}):Promise<any>{
    requireCapability(actor,WarehouseCapability.Manage);
    if(!input.warehouseId||!input.name?.trim()) throw new WarehouseValidationError('warehouseId and name are required');
    const locationType=input.locationType?.trim().toUpperCase();
    if(!['RECEIVING','STORAGE','STAGING','PICK','QUARANTINE','DISPATCH'].includes(locationType)) throw new WarehouseValidationError('Unsupported locationType');
    try{
      const result=await this.database.query<any>(`INSERT INTO warehouse.locations(warehouse_id,parent_location_id,code,name,location_type,created_by,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,[input.warehouseId,input.parentLocationId||null,code(input.code,'code'),input.name.trim(),locationType,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'warehouse.location_created',targetType:'warehouse.location',targetId:result.rows[0].id});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async openStocktake(actor:AuthContext,input:{warehouseId:string;note?:string}):Promise<any>{
    requireCapability(actor,WarehouseCapability.Stocktake);
    try{
      const result=await this.database.query<any>(`INSERT INTO warehouse.stocktake_sessions(warehouse_id,note,opened_by,created_at) VALUES ($1,$2,$3,now()) RETURNING *`,[input.warehouseId,input.note?.trim()??'',actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'warehouse.stocktake_opened',targetType:'warehouse.stocktake',targetId:result.rows[0].id});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async recordCount(actor:AuthContext,sessionId:string,input:{locationId:string;itemKind:InventoryItemKind;itemId:string;countedQuantity:string|number;unit:string}):Promise<any>{
    requireCapability(actor,WarehouseCapability.Stocktake);
    const counted=String(input.countedQuantity).trim();
    if(!/^\d+(?:\.\d{1,6})?$/.test(counted)) throw new WarehouseValidationError('countedQuantity must be zero or a positive decimal');
    const unit=input.unit.trim().toUpperCase();
    await this.assertItem(input.itemKind,input.itemId,unit,this.database);
    const ids=this.itemIds(input.itemKind,input.itemId);
    try{
      const result=await this.database.query<any>(`INSERT INTO warehouse.stocktake_counts(session_id,location_id,item_kind,part_id,sku_id,vehicle_id,counted_quantity,unit,counted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[sessionId,input.locationId,input.itemKind,ids.partId,ids.skuId,ids.vehicleId,counted,unit,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'warehouse.stocktake_counted',targetType:'warehouse.stocktake',targetId:sessionId,metadata:{countId:result.rows[0].id,locationId:input.locationId,itemKind:input.itemKind}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async closeStocktake(actor:AuthContext,sessionId:string):Promise<any>{
    requireCapability(actor,WarehouseCapability.Stocktake);
    return this.database.transaction(async(client)=>{
      const sessionResult=await client.query<any>(`SELECT * FROM warehouse.stocktake_sessions WHERE id=$1 FOR UPDATE`,[sessionId]);
      const session=sessionResult.rows[0];
      if(!session) throw new WarehouseNotFoundError('Stocktake session not found');
      if(session.status!=='OPEN') throw new WarehouseConflictError('Stocktake session is no longer open');

      const latest=await client.query<any>(`WITH latest AS (
        SELECT DISTINCT ON (location_id,item_kind,part_id,sku_id,vehicle_id,upper(unit)) *
        FROM warehouse.stocktake_counts WHERE session_id=$1
        ORDER BY location_id,item_kind,part_id,sku_id,vehicle_id,upper(unit),counted_at DESC,id DESC
      )
      SELECT * FROM latest ORDER BY counted_at,id`,[sessionId]);
      if(!latest.rows.length) throw new WarehouseConflictError('At least one stocktake count is required before close');

      const corrections:{row:any;delta:string}[]=[];
      for(const row of latest.rows){
        const itemId=row.part_id??row.sku_id??row.vehicle_id;
        const balance=await this.inventory.balanceAt({itemKind:row.item_kind,itemId,unit:row.unit,locationId:row.location_id},client);
        const deltaResult=await client.query<{delta:string}>(`SELECT ($1::numeric-$2::numeric)::text AS delta`,[row.counted_quantity,balance]);
        corrections.push({row,delta:deltaResult.rows[0]?.delta??'0'});
      }
      corrections.sort((a,b)=>Number(a.delta)-Number(b.delta));
      for(const correction of corrections){
        if(Number(correction.delta)===0) continue;
        const row=correction.row;const itemId=row.part_id??row.sku_id??row.vehicle_id;
        await this.inventory.postStocktakeCorrection(actor,{itemKind:row.item_kind,itemId,unit:row.unit,locationId:row.location_id,delta:correction.delta,stocktakeId:sessionId,countId:row.id},client);
      }
      const closed=await client.query<any>(`UPDATE warehouse.stocktake_sessions SET status='CLOSED',closed_by=$2,closed_at=now() WHERE id=$1 AND status='OPEN' RETURNING *`,[sessionId,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'warehouse.stocktake_closed',targetType:'warehouse.stocktake',targetId:sessionId,metadata:{countLines:latest.rows.length,correctionLines:corrections.filter(item=>Number(item.delta)!==0).length}},client);
      return closed.rows[0];
    });
  }

  async cancelStocktake(actor:AuthContext,sessionId:string):Promise<any>{
    requireCapability(actor,WarehouseCapability.Stocktake);
    const result=await this.database.query<any>(`UPDATE warehouse.stocktake_sessions SET status='CANCELLED',closed_by=$2,closed_at=now() WHERE id=$1 AND status='OPEN' RETURNING *`,[sessionId,actor.userId]);
    if(!result.rows[0]) throw new WarehouseConflictError('Stocktake session is missing or no longer open');
    await this.audit.record({actorUserId:actor.userId,action:'warehouse.stocktake_cancelled',targetType:'warehouse.stocktake',targetId:sessionId});
    return result.rows[0];
  }

  private itemIds(kind:InventoryItemKind,id:string){
    if(kind==='PART')return{partId:id,skuId:null,vehicleId:null};
    if(kind==='SKU')return{partId:null,skuId:id,vehicleId:null};
    if(kind==='VEHICLE')return{partId:null,skuId:null,vehicleId:id};
    throw new WarehouseValidationError('Unsupported item kind');
  }

  private async assertItem(kind:InventoryItemKind,id:string,unit:string,executor:QueryExecutor):Promise<void>{
    if(kind==='PART'){
      const result=await executor.query<{unit:string}>(`SELECT default_unit AS unit FROM engineering.parts WHERE id=$1`,[id]);
      if(!result.rows[0])throw new WarehouseNotFoundError('Part not found');
      if(result.rows[0].unit.trim().toUpperCase()!==unit)throw new WarehouseValidationError(`Part unit must be ${result.rows[0].unit}`);
      return;
    }
    if(kind==='SKU'){
      const result=await executor.query(`SELECT 1 FROM product.skus WHERE id=$1`,[id]);if(!result.rows[0])throw new WarehouseNotFoundError('SKU not found');if(unit!=='EA')throw new WarehouseValidationError('SKU stocktake unit must be EA');return;
    }
    if(kind==='VEHICLE'){
      const result=await executor.query(`SELECT 1 FROM vehicle.vehicles WHERE id=$1`,[id]);if(!result.rows[0])throw new WarehouseNotFoundError('Vehicle not found');if(unit!=='EA')throw new WarehouseValidationError('Vehicle stocktake unit must be EA');return;
    }
    throw new WarehouseValidationError('Unsupported item kind');
  }

  private rethrow(error:any):never{
    const message=String(error?.message??'');
    if(error?.code==='23503')throw new WarehouseNotFoundError('Referenced warehouse, Partner, location or item not found');
    if(error?.code==='23505')throw new WarehouseConflictError('Warehouse or location code already exists');
    if(error?.code==='23514')throw new WarehouseValidationError(message);
    if(/same warehouse|Stocktake session|location must belong|append-only|Invalid stocktake/i.test(message))throw new WarehouseConflictError(message);
    throw error;
  }
}
