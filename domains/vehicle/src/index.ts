import type { AuditService } from '@alsvid/audit';
import type { Database } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';

export const VehicleCapability = { Read:'vehicle.read', Birth:'vehicle.birth' } as const;
export class VehicleValidationError extends Error {}
export class VehicleNotFoundError extends Error {}
export class VehicleConflictError extends Error {}

function requireCapability(actor:AuthContext,capability:string):void{if(!actor.permissions.includes(capability))throw new PermissionDeniedError(capability);}

export function normalizeFrameNumber(value:string):string{
  const frame=value.trim().toUpperCase().replace(/\s+/g,'');
  if(!/^[A-Z0-9][A-Z0-9-]{3,63}$/.test(frame))throw new VehicleValidationError('Frame number must contain 4-64 letters, digits or hyphens');
  return frame;
}

export class VehicleService{
  constructor(private readonly database:Database,private readonly audit:AuditService){}

  async list(actor:AuthContext):Promise<any[]>{
    requireCapability(actor,VehicleCapability.Read);
    const result=await this.database.query<any>(`SELECT v.*,po.production_order_number,bs.code AS build_spec_code,s.sku,p.display_name AS factory_name,u.unit_no
      FROM vehicle.vehicles v JOIN production.production_units u ON u.id=v.production_unit_id
      JOIN production.production_orders po ON po.id=v.production_order_id
      JOIN engineering.build_specs bs ON bs.id=v.build_spec_id JOIN product.skus s ON s.id=v.sku_id
      JOIN partners.partners p ON p.id=v.factory_partner_id ORDER BY v.born_at DESC LIMIT 1000`);
    return result.rows;
  }

  async birth(actor:AuthContext,unitId:string,frameNumberInput:string):Promise<any>{
    requireCapability(actor,VehicleCapability.Birth);
    const frameNumber=normalizeFrameNumber(frameNumberInput);
    try{
      return await this.database.transaction(async(client)=>{
        const unit=await client.query<any>(`SELECT u.id,u.status,u.production_order_id,po.build_spec_id,po.factory_partner_id,bs.sku_id
          FROM production.production_units u JOIN production.production_orders po ON po.id=u.production_order_id
          JOIN engineering.build_specs bs ON bs.id=po.build_spec_id WHERE u.id=$1 FOR UPDATE OF u`,[unitId]);
        if(!unit.rows[0])throw new VehicleNotFoundError('Production unit not found');
        if(unit.rows[0].status!=='QC_PASSED')throw new VehicleConflictError('Vehicle birth requires QC_PASSED production unit');
        const qc=await client.query<any>(`SELECT id,result FROM production.qc_inspections WHERE production_unit_id=$1 ORDER BY inspected_at DESC,id DESC LIMIT 1`,[unitId]);
        if(!qc.rows[0]||qc.rows[0].result!=='PASS')throw new VehicleConflictError('Latest QC inspection must be PASS');
        const created=await client.query<any>(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id,created_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[frameNumber,unitId,unit.rows[0].production_order_id,unit.rows[0].build_spec_id,unit.rows[0].sku_id,unit.rows[0].factory_partner_id,qc.rows[0].id,actor.userId]);
        await this.audit.record({actorUserId:actor.userId,action:'vehicle.born',targetType:'vehicle',targetId:created.rows[0].id,metadata:{frameNumber,productionUnitId:unitId}},client);
        return created.rows[0];
      });
    }catch(error:any){
      if(error instanceof VehicleNotFoundError||error instanceof VehicleConflictError||error instanceof VehicleValidationError)throw error;
      if(error?.code==='23505')throw new VehicleConflictError('Frame number or production unit already has a Vehicle identity');
      const message=String(error?.message??'');
      if(message.includes('Vehicle birth'))throw new VehicleConflictError(message);
      throw error;
    }
  }
}
