import type { AuditService } from '@alsvid/audit';
import type { Database, QueryExecutor } from '@alsvid/database';
import { PermissionDeniedError, type AuthContext } from '@alsvid/identity';
import type { InventoryService } from '@alsvid/inventory';

export const LogisticsCapability = {
  Read: 'logistics.read',
  Plan: 'logistics.plan',
  Release: 'logistics.release',
  Milestone: 'logistics.milestone',
  Customs: 'logistics.customs',
} as const;

export type ShipmentRoute = 'FACTORY_TO_GERMANY_WAREHOUSE' | 'FACTORY_TO_DEALER_DIRECT';
export type ShipmentCargoKind = 'SKU' | 'VEHICLE';
export type ShipmentEventType =
  | 'BOOKED' | 'CARGO_READY' | 'PICKED_UP' | 'CHINA_EXPORT_DECLARED' | 'CHINA_EXPORT_CLEARED'
  | 'DEPARTED' | 'IN_TRANSIT' | 'ARRIVED_EU' | 'IMPORT_DECLARED' | 'IMPORT_CLEARED'
  | 'DELIVERED_GERMANY_WAREHOUSE' | 'DELIVERED_DEALER' | 'EXCEPTION' | 'HOLD' | 'RELEASED_FROM_HOLD';
export type CustomsEventType = 'DECLARED' | 'HELD' | 'RELEASED_FROM_HOLD' | 'CLEARED' | 'CORRECTED' | 'CANCELLED';

export class LogisticsValidationError extends Error {}
export class LogisticsNotFoundError extends Error {}
export class LogisticsConflictError extends Error {}

function requireCapability(actor: AuthContext, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new PermissionDeniedError(capability);
}

function positiveDecimal(value: string | number, name: string): string {
  const text=String(value).trim();
  if(!/^\d+(?:\.\d{1,6})?$/.test(text) || /^0+(?:\.0+)?$/.test(text)) throw new LogisticsValidationError(`${name} must be a positive decimal`);
  return text;
}

function optionalDecimal(value: unknown, name: string): string | null {
  if(value===undefined || value===null || String(value).trim()==='') return null;
  const text=String(value).trim();
  if(!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new LogisticsValidationError(`${name} must be zero or a positive decimal`);
  return text;
}

function upperOrNull(value: unknown): string | null {
  const text=String(value??'').trim().toUpperCase();
  return text || null;
}

export class LogisticsService {
  constructor(
    private readonly database: Database,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  async summary(actor:AuthContext):Promise<any>{
    requireCapability(actor,LogisticsCapability.Read);
    const [shipments,cargo,events,declarations,customsLines,customsEvents,handoffs]=await Promise.all([
      this.database.query<any>(`SELECT sh.*,
        ol.code AS origin_location_code,ow.code AS origin_warehouse_code,ow.name AS origin_warehouse_name,
        dl.code AS destination_location_code,dw.code AS destination_warehouse_code,dw.name AS destination_warehouse_name,
        dp.partner_code AS dealer_code,dp.display_name AS dealer_name,
        da.line1 AS dealer_address_line1,da.city AS dealer_city,da.country_code AS dealer_country_code,
        cp.partner_code AS carrier_code,cp.display_name AS carrier_name
        FROM logistics.shipments sh
        JOIN warehouse.locations ol ON ol.id=sh.origin_location_id JOIN warehouse.warehouses ow ON ow.id=ol.warehouse_id
        LEFT JOIN warehouse.locations dl ON dl.id=sh.destination_location_id LEFT JOIN warehouse.warehouses dw ON dw.id=dl.warehouse_id
        LEFT JOIN partners.partners dp ON dp.id=sh.destination_dealer_partner_id LEFT JOIN partners.addresses da ON da.id=sh.destination_address_id
        LEFT JOIN partners.partners cp ON cp.id=sh.carrier_partner_id
        ORDER BY sh.created_at DESC LIMIT 300`),
      this.database.query<any>(`SELECT c.*,r.status AS reservation_status,r.location_id AS reserved_location_id,
        s.sku,s.name AS sku_name,v.frame_number,v.vehicle_code,vs.sku AS vehicle_sku
        FROM logistics.shipment_cargo c
        JOIN inventory.reservations r ON r.id=c.reservation_id
        LEFT JOIN product.skus s ON s.id=c.sku_id
        LEFT JOIN vehicle.vehicles v ON v.id=c.vehicle_id LEFT JOIN product.skus vs ON vs.id=v.sku_id
        ORDER BY c.created_at,c.id`),
      this.database.query<any>(`SELECT * FROM logistics.shipment_events ORDER BY occurred_at,created_at,id`),
      this.database.query<any>(`SELECT d.*,
        ep.display_name AS exporter_name,ip.display_name AS importer_name,iop.display_name AS importer_of_record_name,
        ee.raw_value AS exporter_eori,ie.raw_value AS importer_eori,ioe.raw_value AS importer_of_record_eori,
        (SELECT ce.event_type FROM logistics.customs_events ce WHERE ce.declaration_id=d.id ORDER BY ce.occurred_at DESC,ce.created_at DESC,ce.id DESC LIMIT 1) AS status
        FROM logistics.customs_declarations d
        LEFT JOIN partners.partners ep ON ep.id=d.exporter_partner_id LEFT JOIN partners.partners ip ON ip.id=d.importer_partner_id LEFT JOIN partners.partners iop ON iop.id=d.importer_of_record_partner_id
        LEFT JOIN partners.identifiers ee ON ee.id=d.exporter_eori_identifier_id LEFT JOIN partners.identifiers ie ON ie.id=d.importer_eori_identifier_id LEFT JOIN partners.identifiers ioe ON ioe.id=d.importer_of_record_eori_identifier_id
        ORDER BY d.created_at DESC LIMIT 500`),
      this.database.query<any>(`SELECT l.*,c.item_kind,s.sku,v.frame_number FROM logistics.customs_lines l JOIN logistics.shipment_cargo c ON c.id=l.cargo_id LEFT JOIN product.skus s ON s.id=c.sku_id LEFT JOIN vehicle.vehicles v ON v.id=c.vehicle_id ORDER BY l.created_at,l.id`),
      this.database.query<any>(`SELECT * FROM logistics.customs_events ORDER BY occurred_at,created_at,id`),
      this.database.query<any>(`SELECT h.*,m.movement_number,c.item_kind,s.sku,v.frame_number,l.code AS destination_location_code,w.code AS destination_warehouse_code
        FROM logistics.receiving_handoffs h JOIN inventory.movements m ON m.id=h.inventory_movement_id JOIN logistics.shipment_cargo c ON c.id=h.cargo_id
        JOIN warehouse.locations l ON l.id=h.destination_location_id JOIN warehouse.warehouses w ON w.id=l.warehouse_id
        LEFT JOIN product.skus s ON s.id=c.sku_id LEFT JOIN vehicle.vehicles v ON v.id=c.vehicle_id ORDER BY h.received_at DESC`),
    ]);
    return{shipments:shipments.rows,cargo:cargo.rows,events:events.rows,declarations:declarations.rows,customsLines:customsLines.rows,customsEvents:customsEvents.rows,handoffs:handoffs.rows};
  }

  async createShipment(actor:AuthContext,input:{routeType:ShipmentRoute;originLocationId:string;destinationLocationId?:string;destinationDealerPartnerId?:string;destinationAddressId?:string;carrierPartnerId?:string;transportMode?:string;incoterm?:string;bookingReference?:string;billOfLading?:string;containerReference?:string;trackingReference?:string;plannedEtd?:string;plannedEta?:string;note?:string}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Plan);
    if(!input.routeType||!input.originLocationId) throw new LogisticsValidationError('routeType and originLocationId are required');
    try{
      const result=await this.database.query<any>(`INSERT INTO logistics.shipments(route_type,origin_location_id,destination_location_id,destination_dealer_partner_id,destination_address_id,carrier_partner_id,transport_mode,incoterm,booking_reference,bill_of_lading,container_reference,tracking_reference,planned_etd,planned_eta,note,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16) RETURNING *`,[
        input.routeType,input.originLocationId,input.destinationLocationId||null,input.destinationDealerPartnerId||null,input.destinationAddressId||null,input.carrierPartnerId||null,
        upperOrNull(input.transportMode)??'SEA',upperOrNull(input.incoterm),input.bookingReference?.trim()||null,input.billOfLading?.trim()||null,input.containerReference?.trim()||null,input.trackingReference?.trim()||null,
        input.plannedEtd||null,input.plannedEta||null,input.note?.trim()??'',actor.userId,
      ]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.shipment_created',targetType:'logistics.shipment',targetId:result.rows[0].id,metadata:{routeType:input.routeType}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async allocateCargo(actor:AuthContext,shipmentId:string,input:{itemKind:ShipmentCargoKind;itemId:string;quantity:string|number;note?:string}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Plan);
    return this.database.transaction(async(client)=>{
      const shipmentResult=await client.query<any>(`SELECT * FROM logistics.shipments WHERE id=$1 FOR UPDATE`,[shipmentId]);
      const shipment=shipmentResult.rows[0];
      if(!shipment) throw new LogisticsNotFoundError('Shipment not found');
      if(shipment.status!=='DRAFT') throw new LogisticsConflictError('Cargo can be allocated only while shipment is draft');
      const quantity=input.itemKind==='VEHICLE'?'1':positiveDecimal(input.quantity,'quantity');
      if(input.itemKind==='VEHICLE' && String(input.quantity)!=='1') throw new LogisticsValidationError('Vehicle shipment quantity must be 1');
      const reservation=await this.inventory.createReservation(actor,{
        itemKind:input.itemKind,itemId:input.itemId,unit:'EA',locationId:shipment.origin_location_id,quantity,
        referenceType:'SHIPMENT',referenceId:shipmentId,note:input.note?.trim()||'Export shipment allocation',
      },client);
      try{
        const ids=input.itemKind==='SKU'?{skuId:input.itemId,vehicleId:null}:{skuId:null,vehicleId:input.itemId};
        const result=await client.query<any>(`INSERT INTO logistics.shipment_cargo(shipment_id,item_kind,sku_id,vehicle_id,quantity,unit,reservation_id,note,created_by)
          VALUES ($1,$2,$3,$4,$5,'EA',$6,$7,$8) RETURNING *`,[shipmentId,input.itemKind,ids.skuId,ids.vehicleId,quantity,reservation.id,input.note?.trim()??'',actor.userId]);
        await this.audit.record({actorUserId:actor.userId,action:'logistics.cargo_allocated',targetType:'logistics.shipment',targetId:shipmentId,metadata:{cargoId:result.rows[0].id,itemKind:input.itemKind,reservationId:reservation.id}},client);
        return result.rows[0];
      }catch(error:any){this.rethrow(error);}
    });
  }

  async removeCargo(actor:AuthContext,cargoId:string):Promise<void>{
    requireCapability(actor,LogisticsCapability.Plan);
    await this.database.transaction(async(client)=>{
      const result=await client.query<any>(`SELECT c.*,sh.status FROM logistics.shipment_cargo c JOIN logistics.shipments sh ON sh.id=c.shipment_id WHERE c.id=$1 FOR UPDATE OF c`,[cargoId]);
      const cargo=result.rows[0];
      if(!cargo) throw new LogisticsNotFoundError('Shipment cargo not found');
      if(cargo.status!=='DRAFT') throw new LogisticsConflictError('Cargo can be removed only while shipment is draft');
      await this.inventory.releaseReservation(actor,cargo.reservation_id,client);
      await client.query(`DELETE FROM logistics.shipment_cargo WHERE id=$1`,[cargoId]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.cargo_removed',targetType:'logistics.shipment',targetId:cargo.shipment_id,metadata:{cargoId}},client);
    });
  }

  async releaseShipment(actor:AuthContext,shipmentId:string):Promise<any>{
    requireCapability(actor,LogisticsCapability.Release);
    return this.database.transaction(async(client)=>{
      const shipmentResult=await client.query<any>(`SELECT * FROM logistics.shipments WHERE id=$1 FOR UPDATE`,[shipmentId]);
      const shipment=shipmentResult.rows[0];
      if(!shipment) throw new LogisticsNotFoundError('Shipment not found');
      if(shipment.status!=='DRAFT') throw new LogisticsConflictError('Only draft shipments can be released');
      const cargo=await client.query<{count:number;inactive:number}>(`SELECT count(*)::int AS count,count(*) FILTER (WHERE r.status<>'ACTIVE')::int AS inactive FROM logistics.shipment_cargo c JOIN inventory.reservations r ON r.id=c.reservation_id WHERE c.shipment_id=$1`,[shipmentId]);
      if(!cargo.rows[0] || cargo.rows[0].count===0) throw new LogisticsConflictError('Shipment requires at least one cargo allocation');
      if(cargo.rows[0].inactive!==0) throw new LogisticsConflictError('Every shipment cargo reservation must still be active');
      const updated=await client.query<any>(`UPDATE logistics.shipments SET status='RELEASED',released_at=now(),updated_at=now(),updated_by=$2,version=version+1 WHERE id=$1 AND status='DRAFT' RETURNING *`,[shipmentId,actor.userId]);
      await client.query(`INSERT INTO logistics.shipment_events(shipment_id,event_type,note,created_by) VALUES ($1,'CARGO_READY','Shipment released with reserved cargo',$2)`,[shipmentId,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.shipment_released',targetType:'logistics.shipment',targetId:shipmentId,metadata:{cargoLines:cargo.rows[0].count}},client);
      return updated.rows[0];
    });
  }

  async dispatchShipment(actor:AuthContext,shipmentId:string):Promise<any>{
    requireCapability(actor,LogisticsCapability.Release);
    return this.database.transaction(async(client)=>{
      const shipmentResult=await client.query<any>(`SELECT * FROM logistics.shipments WHERE id=$1 FOR UPDATE`,[shipmentId]);
      const shipment=shipmentResult.rows[0];
      if(!shipment) throw new LogisticsNotFoundError('Shipment not found');
      if(shipment.status!=='RELEASED') throw new LogisticsConflictError('Only released shipments can dispatch');
      const cargo=await client.query<any>(`SELECT c.* FROM logistics.shipment_cargo c WHERE c.shipment_id=$1 ORDER BY c.created_at,c.id FOR UPDATE`,[shipmentId]);
      if(!cargo.rows.length) throw new LogisticsConflictError('Shipment has no cargo');
      for(const row of cargo.rows){
        await this.inventory.issueReservation(actor,row.reservation_id,{
          idempotencyKey:`shipment-dispatch:${shipmentId}:${row.id}`,reason:'Export shipment dispatch',referenceType:'SHIPMENT',referenceId:shipmentId,
        },client);
      }
      const updated=await client.query<any>(`UPDATE logistics.shipments SET status='DISPATCHED',dispatched_at=now(),updated_at=now(),updated_by=$2,version=version+1 WHERE id=$1 AND status='RELEASED' RETURNING *`,[shipmentId,actor.userId]);
      await client.query(`INSERT INTO logistics.shipment_events(shipment_id,event_type,note,created_by) VALUES ($1,'PICKED_UP','Cargo dispatched from ALSVID inventory',$2)`,[shipmentId,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.shipment_dispatched',targetType:'logistics.shipment',targetId:shipmentId,metadata:{cargoLines:cargo.rows.length}},client);
      return updated.rows[0];
    });
  }

  async addMilestone(actor:AuthContext,shipmentId:string,input:{eventType:ShipmentEventType;occurredAt?:string;locationText?:string;note?:string;metadata?:Record<string,unknown>}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Milestone);
    return this.database.transaction(async(client)=>{
      const shipmentResult=await client.query<any>(`SELECT * FROM logistics.shipments WHERE id=$1 FOR UPDATE`,[shipmentId]);
      const shipment=shipmentResult.rows[0];
      if(!shipment) throw new LogisticsNotFoundError('Shipment not found');
      if(shipment.status==='CANCELLED' || shipment.status==='DELIVERED') throw new LogisticsConflictError('Completed/cancelled shipment cannot accept new operational milestones');
      if(['DEPARTED','IN_TRANSIT','ARRIVED_EU','DELIVERED_GERMANY_WAREHOUSE','DELIVERED_DEALER'].includes(input.eventType) && !['DISPATCHED','IN_TRANSIT','ARRIVED'].includes(shipment.status)) throw new LogisticsConflictError('Transport milestone requires a dispatched shipment');
      let nextStatus:string|null=null;
      if(input.eventType==='DEPARTED' || input.eventType==='IN_TRANSIT') nextStatus=shipment.status==='DISPATCHED'?'IN_TRANSIT':null;
      if(input.eventType==='ARRIVED_EU') nextStatus='ARRIVED';
      if(input.eventType==='DELIVERED_GERMANY_WAREHOUSE' || input.eventType==='DELIVERED_DEALER') nextStatus='DELIVERED';
      const event=await client.query<any>(`INSERT INTO logistics.shipment_events(shipment_id,event_type,occurred_at,location_text,note,metadata,created_by) VALUES ($1,$2,COALESCE($3::timestamptz,now()),$4,$5,$6::jsonb,$7) RETURNING *`,[shipmentId,input.eventType,input.occurredAt||null,input.locationText?.trim()||null,input.note?.trim()??'',JSON.stringify(input.metadata??{}),actor.userId]);
      if(nextStatus){
        await client.query(`UPDATE logistics.shipments SET status=$2,delivered_at=CASE WHEN $2='DELIVERED' THEN $3::timestamptz ELSE delivered_at END,updated_at=now(),updated_by=$4,version=version+1 WHERE id=$1`,[shipmentId,nextStatus,event.rows[0].occurred_at,actor.userId]);
      }
      await this.audit.record({actorUserId:actor.userId,action:'logistics.milestone_appended',targetType:'logistics.shipment',targetId:shipmentId,metadata:{eventId:event.rows[0].id,eventType:input.eventType}},client);
      return event.rows[0];
    });
  }

  async cancelShipment(actor:AuthContext,shipmentId:string,input:{reason?:string}={}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Release);
    return this.database.transaction(async(client)=>{
      const shipmentResult=await client.query<any>(`SELECT * FROM logistics.shipments WHERE id=$1 FOR UPDATE`,[shipmentId]);
      const shipment=shipmentResult.rows[0];
      if(!shipment) throw new LogisticsNotFoundError('Shipment not found');
      if(!['DRAFT','RELEASED'].includes(shipment.status)) throw new LogisticsConflictError('Only draft or released shipments can be cancelled');
      const reservations=await client.query<{reservation_id:string}>(`SELECT reservation_id FROM logistics.shipment_cargo WHERE shipment_id=$1`,[shipmentId]);
      for(const row of reservations.rows){
        const state=await client.query<{status:string}>(`SELECT status FROM inventory.reservations WHERE id=$1`,[row.reservation_id]);
        if(state.rows[0]?.status==='ACTIVE') await this.inventory.releaseReservation(actor,row.reservation_id,client);
      }
      const updated=await client.query<any>(`UPDATE logistics.shipments SET status='CANCELLED',updated_at=now(),updated_by=$2,version=version+1 WHERE id=$1 RETURNING *`,[shipmentId,actor.userId]);
      await client.query(`INSERT INTO logistics.shipment_events(shipment_id,event_type,note,created_by) VALUES ($1,'CANCELLED',$2,$3)`,[shipmentId,input.reason?.trim()||'Shipment cancelled',actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.shipment_cancelled',targetType:'logistics.shipment',targetId:shipmentId,metadata:{reason:input.reason?.trim()??''}},client);
      return updated.rows[0];
    });
  }

  async receiveGermanyShipment(actor:AuthContext,shipmentId:string):Promise<any>{
    requireCapability(actor,LogisticsCapability.Release);
    return this.database.transaction(async(client)=>{
      const shipmentResult=await client.query<any>(`SELECT * FROM logistics.shipments WHERE id=$1 FOR UPDATE`,[shipmentId]);
      const shipment=shipmentResult.rows[0];
      if(!shipment) throw new LogisticsNotFoundError('Shipment not found');
      if(shipment.route_type!=='FACTORY_TO_GERMANY_WAREHOUSE') throw new LogisticsConflictError('Dealer-direct shipment must not create a Germany warehouse receipt');
      if(shipment.status!=='DELIVERED') throw new LogisticsConflictError('Germany inventory receipt requires a delivered shipment');
      if(shipment.inventory_received_at) throw new LogisticsConflictError('Shipment cargo has already been received into Inventory');
      const delivered=await client.query(`SELECT 1 FROM logistics.shipment_events WHERE shipment_id=$1 AND event_type='DELIVERED_GERMANY_WAREHOUSE' LIMIT 1`,[shipmentId]);
      if(!delivered.rows[0]) throw new LogisticsConflictError('Germany warehouse delivery milestone is required before inventory receipt');
      const cargo=await client.query<any>(`SELECT * FROM logistics.shipment_cargo WHERE shipment_id=$1 ORDER BY created_at,id`,[shipmentId]);
      for(const row of cargo.rows){
        const itemId=row.sku_id??row.vehicle_id;
        const movement=await this.inventory.postMovement(actor,{
          movementType:'RECEIPT',itemKind:row.item_kind,itemId,unit:'EA',quantity:row.quantity,destinationLocationId:shipment.destination_location_id,
          referenceType:'SHIPMENT',referenceId:shipmentId,reason:'Germany warehouse receiving from export shipment',idempotencyKey:`shipment-receive:${shipmentId}:${row.id}`,correlationId:shipmentId,
        },client);
        await client.query(`INSERT INTO logistics.receiving_handoffs(shipment_id,cargo_id,inventory_movement_id,destination_location_id,received_by) VALUES ($1,$2,$3,$4,$5)`,[shipmentId,row.id,movement.id,shipment.destination_location_id,actor.userId]);
      }
      const updated=await client.query<any>(`UPDATE logistics.shipments SET inventory_received_at=now(),updated_at=now(),updated_by=$2,version=version+1 WHERE id=$1 RETURNING *`,[shipmentId,actor.userId]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.germany_inventory_received',targetType:'logistics.shipment',targetId:shipmentId,metadata:{cargoLines:cargo.rows.length,destinationLocationId:shipment.destination_location_id}},client);
      return updated.rows[0];
    });
  }

  async createCustomsDeclaration(actor:AuthContext,shipmentId:string,input:{direction:'EXPORT'|'IMPORT';jurisdiction:string;declarationNumber?:string;exporterPartnerId?:string;importerPartnerId?:string;importerOfRecordPartnerId?:string;exporterEoriIdentifierId?:string;importerEoriIdentifierId?:string;importerOfRecordEoriIdentifierId?:string;commercialInvoiceNumber?:string;packingListNumber?:string;commercialInvoiceAssetId?:string;packingListAssetId?:string;customsDocumentAssetId?:string;currency?:string;note?:string}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Customs);
    if(!input.direction||!input.jurisdiction?.trim()) throw new LogisticsValidationError('direction and jurisdiction are required');
    try{
      const result=await this.database.query<any>(`INSERT INTO logistics.customs_declarations(shipment_id,direction,jurisdiction,declaration_number,exporter_partner_id,importer_partner_id,importer_of_record_partner_id,exporter_eori_identifier_id,importer_eori_identifier_id,importer_of_record_eori_identifier_id,commercial_invoice_number,packing_list_number,commercial_invoice_asset_id,packing_list_asset_id,customs_document_asset_id,currency,note,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,[
        shipmentId,input.direction,input.jurisdiction.trim().toUpperCase(),input.declarationNumber?.trim()||null,input.exporterPartnerId||null,input.importerPartnerId||null,input.importerOfRecordPartnerId||null,
        input.exporterEoriIdentifierId||null,input.importerEoriIdentifierId||null,input.importerOfRecordEoriIdentifierId||null,input.commercialInvoiceNumber?.trim()||null,input.packingListNumber?.trim()||null,
        input.commercialInvoiceAssetId||null,input.packingListAssetId||null,input.customsDocumentAssetId||null,upperOrNull(input.currency)??'EUR',input.note?.trim()??'',actor.userId,
      ]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.customs_declaration_created',targetType:'logistics.customs_declaration',targetId:result.rows[0].id,metadata:{shipmentId,direction:input.direction}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async updateCustomsDraft(actor:AuthContext,declarationId:string,input:{declarationNumber?:string;exporterPartnerId?:string;importerPartnerId?:string;importerOfRecordPartnerId?:string;exporterEoriIdentifierId?:string;importerEoriIdentifierId?:string;importerOfRecordEoriIdentifierId?:string;commercialInvoiceNumber?:string;packingListNumber?:string;commercialInvoiceAssetId?:string;packingListAssetId?:string;customsDocumentAssetId?:string;currency?:string;note?:string}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Customs);
    const latest=await this.database.query<{status:string}>(`SELECT event_type AS status FROM logistics.customs_events WHERE declaration_id=$1 ORDER BY occurred_at DESC,created_at DESC,id DESC LIMIT 1`,[declarationId]);
    if(!latest.rows[0]) throw new LogisticsNotFoundError('Customs declaration not found');
    if(latest.rows[0].status!=='DRAFT') throw new LogisticsConflictError('Customs declaration header is editable only while DRAFT');
    try{
      const result=await this.database.query<any>(`UPDATE logistics.customs_declarations SET
        declaration_number=COALESCE($2,declaration_number),exporter_partner_id=COALESCE($3,exporter_partner_id),importer_partner_id=COALESCE($4,importer_partner_id),importer_of_record_partner_id=COALESCE($5,importer_of_record_partner_id),
        exporter_eori_identifier_id=COALESCE($6,exporter_eori_identifier_id),importer_eori_identifier_id=COALESCE($7,importer_eori_identifier_id),importer_of_record_eori_identifier_id=COALESCE($8,importer_of_record_eori_identifier_id),
        commercial_invoice_number=COALESCE($9,commercial_invoice_number),packing_list_number=COALESCE($10,packing_list_number),commercial_invoice_asset_id=COALESCE($11,commercial_invoice_asset_id),packing_list_asset_id=COALESCE($12,packing_list_asset_id),customs_document_asset_id=COALESCE($13,customs_document_asset_id),
        currency=COALESCE($14,currency),note=COALESCE($15,note) WHERE id=$1 RETURNING *`,[declarationId,input.declarationNumber?.trim()||null,input.exporterPartnerId||null,input.importerPartnerId||null,input.importerOfRecordPartnerId||null,input.exporterEoriIdentifierId||null,input.importerEoriIdentifierId||null,input.importerOfRecordEoriIdentifierId||null,input.commercialInvoiceNumber?.trim()||null,input.packingListNumber?.trim()||null,input.commercialInvoiceAssetId||null,input.packingListAssetId||null,input.customsDocumentAssetId||null,upperOrNull(input.currency),input.note?.trim()||null]);
      if(!result.rows[0]) throw new LogisticsNotFoundError('Customs declaration not found');
      await this.audit.record({actorUserId:actor.userId,action:'logistics.customs_declaration_updated',targetType:'logistics.customs_declaration',targetId:declarationId});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async addCustomsLine(actor:AuthContext,declarationId:string,input:{cargoId:string;originCountry:string;hsCode:string;cnCode?:string;taricCode?:string;declaredValue?:string|number;dutyRate?:string|number;dutyAmount?:string|number;importVatRate?:string|number;importVatAmount?:string|number;antiDumpingRate?:string|number;antiDumpingAmount?:string|number;countervailingRate?:string|number;countervailingAmount?:string|number;operationalFeesAmount?:string|number;metadata?:Record<string,unknown>}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Customs);
    if(!input.cargoId||!input.originCountry?.trim()||!input.hsCode?.trim()) throw new LogisticsValidationError('cargoId, originCountry and hsCode are required');
    try{
      const result=await this.database.query<any>(`INSERT INTO logistics.customs_lines(declaration_id,cargo_id,origin_country,hs_code,cn_code,taric_code,declared_value,duty_rate,duty_amount,import_vat_rate,import_vat_amount,anti_dumping_rate,anti_dumping_amount,countervailing_rate,countervailing_amount,operational_fees_amount,metadata,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18) RETURNING *`,[
        declarationId,input.cargoId,input.originCountry.trim().toUpperCase(),input.hsCode.trim(),input.cnCode?.trim()||null,input.taricCode?.trim()||null,optionalDecimal(input.declaredValue,'declaredValue')??'0',
        optionalDecimal(input.dutyRate,'dutyRate'),optionalDecimal(input.dutyAmount,'dutyAmount'),optionalDecimal(input.importVatRate,'importVatRate'),optionalDecimal(input.importVatAmount,'importVatAmount'),
        optionalDecimal(input.antiDumpingRate,'antiDumpingRate'),optionalDecimal(input.antiDumpingAmount,'antiDumpingAmount'),optionalDecimal(input.countervailingRate,'countervailingRate'),optionalDecimal(input.countervailingAmount,'countervailingAmount'),optionalDecimal(input.operationalFeesAmount,'operationalFeesAmount'),JSON.stringify(input.metadata??{}),actor.userId,
      ]);
      await this.audit.record({actorUserId:actor.userId,action:'logistics.customs_line_added',targetType:'logistics.customs_declaration',targetId:declarationId,metadata:{lineId:result.rows[0].id,cargoId:input.cargoId}});
      return result.rows[0];
    }catch(error:any){this.rethrow(error);}
  }

  async addCustomsEvent(actor:AuthContext,declarationId:string,input:{eventType:CustomsEventType;occurredAt?:string;reference?:string;note?:string;metadata?:Record<string,unknown>}):Promise<any>{
    requireCapability(actor,LogisticsCapability.Customs);
    return this.database.transaction(async(client)=>{
      const declarationResult=await client.query<any>(`SELECT * FROM logistics.customs_declarations WHERE id=$1 FOR UPDATE`,[declarationId]);
      const declaration=declarationResult.rows[0];
      if(!declaration) throw new LogisticsNotFoundError('Customs declaration not found');
      const event=await client.query<any>(`INSERT INTO logistics.customs_events(declaration_id,event_type,occurred_at,reference,note,metadata,created_by) VALUES ($1,$2,COALESCE($3::timestamptz,now()),$4,$5,$6::jsonb,$7) RETURNING *`,[declarationId,input.eventType,input.occurredAt||null,input.reference?.trim()||null,input.note?.trim()??'',JSON.stringify(input.metadata??{}),actor.userId]);
      const shipmentEvent=this.customsShipmentEvent(declaration.direction,input.eventType);
      if(shipmentEvent){
        await client.query(`INSERT INTO logistics.shipment_events(shipment_id,event_type,occurred_at,note,metadata,created_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,[declaration.shipment_id,shipmentEvent,event.rows[0].occurred_at,input.note?.trim()??'',JSON.stringify({customsDeclarationId:declarationId,customsEventId:event.rows[0].id}),actor.userId]);
      }
      await this.audit.record({actorUserId:actor.userId,action:'logistics.customs_event_appended',targetType:'logistics.customs_declaration',targetId:declarationId,metadata:{eventId:event.rows[0].id,eventType:input.eventType}},client);
      return event.rows[0];
    });
  }

  private customsShipmentEvent(direction:string,eventType:CustomsEventType):string|null{
    if(eventType==='DECLARED') return direction==='EXPORT'?'CHINA_EXPORT_DECLARED':'IMPORT_DECLARED';
    if(eventType==='CLEARED') return direction==='EXPORT'?'CHINA_EXPORT_CLEARED':'IMPORT_CLEARED';
    if(eventType==='HELD') return 'HOLD';
    if(eventType==='RELEASED_FROM_HOLD') return 'RELEASED_FROM_HOLD';
    return null;
  }

  private rethrow(error:any):never{
    const message=String(error?.message??'');
    if(error instanceof LogisticsValidationError || error instanceof LogisticsNotFoundError || error instanceof LogisticsConflictError) throw error;
    if(error?.code==='23503') throw new LogisticsNotFoundError('Referenced shipment, Partner, address, asset, cargo or Inventory fact was not found');
    if(error?.code==='23505') throw new LogisticsConflictError(message);
    if(error?.code==='23514') throw new LogisticsValidationError(message);
    if(/only while|must have|must belong|requires|does not match|immutable|Invalid shipment transition|Invalid customs event transition|invalid for this route/i.test(message)) throw new LogisticsConflictError(message);
    throw error;
  }
}
