import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import type { VehicleRepository } from '../application/ports.js';

export class PostgresVehicleRepository implements VehicleRepository {
  constructor(private readonly db: DatabasePort) {}

  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  async list(): Promise<any[]> {
    const result = await this.db.query<any>(`
      SELECT v.*,po.production_order_number,bs.code AS build_spec_code,s.sku,p.display_name AS factory_name,u.unit_no,
             lc.lifecycle_state,co.owner_partner_id,owner.display_name AS owner_name,owner.partner_code AS owner_partner_code,
             h.handover_number,h.handed_over_at,dealer.display_name AS dealer_name
      FROM vehicle.vehicles v
      JOIN production.production_units u ON u.id=v.production_unit_id
      JOIN production.production_orders po ON po.id=v.production_order_id
      JOIN engineering.build_specs bs ON bs.id=v.build_spec_id
      JOIN product.skus s ON s.id=v.sku_id
      JOIN partners.partners p ON p.id=v.factory_partner_id
      LEFT JOIN vehicle.v_current_lifecycle lc ON lc.vehicle_id=v.id
      LEFT JOIN vehicle.v_current_ownership co ON co.vehicle_id=v.id
      LEFT JOIN partners.partners owner ON owner.id=co.owner_partner_id
      LEFT JOIN vehicle.handovers h ON h.vehicle_id=v.id
      LEFT JOIN partners.partners dealer ON dealer.id=h.dealer_partner_id
      ORDER BY v.born_at DESC LIMIT 1000
    `);
    return result.rows;
  }

  async findByReference(reference: string): Promise<any | null> {
    const result = await this.db.query<any>(`
      SELECT v.id,v.vehicle_code,v.frame_number,v.born_at,v.sku_id,s.sku,s.name AS sku_name,
             lc.lifecycle_state,co.owner_partner_id,owner.display_name AS owner_name,
             h.handover_number,h.handed_over_at
      FROM vehicle.vehicles v
      JOIN product.skus s ON s.id=v.sku_id
      LEFT JOIN vehicle.v_current_lifecycle lc ON lc.vehicle_id=v.id
      LEFT JOIN vehicle.v_current_ownership co ON co.vehicle_id=v.id
      LEFT JOIN partners.partners owner ON owner.id=co.owner_partner_id
      LEFT JOIN vehicle.handovers h ON h.vehicle_id=v.id
      WHERE upper(v.frame_number)=upper($1) OR upper(v.vehicle_code)=upper($1)
      LIMIT 1
    `,[reference]);
    return result.rows[0] ?? null;
  }

  async get360(vehicleId: string): Promise<any | null> {
    const base = await this.db.query<any>(`
      SELECT v.*,lc.lifecycle_state,lc.lifecycle_changed_at,
             po.production_order_number,po.status AS production_order_status,u.unit_no,u.status AS production_unit_status,
             bs.code AS build_spec_code,bs.name AS build_spec_name,
             s.sku,s.name AS sku_name,vr.code AS variant_code,vr.name AS variant_name,m.code AS model_code,m.name AS model_name,pf.code AS platform_code,pf.name AS platform_name,
             factory.partner_code AS factory_partner_code,factory.display_name AS factory_name,
             qc.result AS birth_qc_result,qc.checklist_code AS birth_qc_checklist,qc.inspected_at AS birth_qc_at,
             co.owner_partner_id,co.owned_since,owner.partner_code AS owner_partner_code,owner.display_name AS owner_name,
             h.id AS handover_id,h.handover_number,h.handed_over_at,h.reference AS handover_reference,h.note AS handover_note,
             dealer.partner_code AS dealer_partner_code,dealer.display_name AS dealer_name,
             customer.partner_code AS handover_customer_partner_code,customer.display_name AS handover_customer_name,
             stock.location_id AS current_location_id,wl.code AS current_location_code,wl.name AS current_location_name,ww.code AS current_warehouse_code,ww.name AS current_warehouse_name,ww.country_code AS current_warehouse_country,
             latest_shipment.shipment_id,latest_shipment.shipment_number,latest_shipment.route_type AS shipment_route_type,latest_shipment.status AS shipment_status,latest_shipment.destination_dealer_partner_id,latest_shipment.destination_dealer_name
      FROM vehicle.vehicles v
      JOIN production.production_units u ON u.id=v.production_unit_id
      JOIN production.production_orders po ON po.id=v.production_order_id
      JOIN engineering.build_specs bs ON bs.id=v.build_spec_id
      JOIN product.skus s ON s.id=v.sku_id
      JOIN product.variants vr ON vr.id=s.variant_id
      JOIN product.models m ON m.id=vr.model_id
      JOIN product.platforms pf ON pf.id=m.platform_id
      JOIN partners.partners factory ON factory.id=v.factory_partner_id
      JOIN production.qc_inspections qc ON qc.id=v.birth_qc_inspection_id
      LEFT JOIN vehicle.v_current_lifecycle lc ON lc.vehicle_id=v.id
      LEFT JOIN vehicle.v_current_ownership co ON co.vehicle_id=v.id
      LEFT JOIN partners.partners owner ON owner.id=co.owner_partner_id
      LEFT JOIN vehicle.handovers h ON h.vehicle_id=v.id
      LEFT JOIN partners.partners dealer ON dealer.id=h.dealer_partner_id
      LEFT JOIN partners.partners customer ON customer.id=h.customer_partner_id
      LEFT JOIN LATERAL(
        SELECT b.location_id FROM inventory.v_location_balances b
        WHERE b.item_kind='VEHICLE' AND b.vehicle_id=v.id AND b.on_hand>0
        ORDER BY b.on_hand DESC,b.location_id LIMIT 1
      ) stock ON true
      LEFT JOIN warehouse.locations wl ON wl.id=stock.location_id
      LEFT JOIN warehouse.warehouses ww ON ww.id=wl.warehouse_id
      LEFT JOIN LATERAL(
        SELECT sh.id AS shipment_id,sh.shipment_number,sh.route_type,sh.status,sh.destination_dealer_partner_id,dp.display_name AS destination_dealer_name
        FROM logistics.shipment_cargo sc JOIN logistics.shipments sh ON sh.id=sc.shipment_id
        LEFT JOIN partners.partners dp ON dp.id=sh.destination_dealer_partner_id
        WHERE sc.vehicle_id=v.id ORDER BY sh.created_at DESC,sh.id DESC LIMIT 1
      ) latest_shipment ON true
      WHERE v.id=$1
    `,[vehicleId]);
    if (!base.rows[0]) return null;

    const [lifecycle,ownership,handovers,qc,deviations,logisticsEvents,inventoryMovements] = await Promise.all([
      this.db.query<any>(`SELECT * FROM vehicle.lifecycle_events WHERE vehicle_id=$1 ORDER BY sequence_no`,[vehicleId]),
      this.db.query<any>(`
        SELECT e.*,owner.partner_code AS owner_partner_code,owner.display_name AS owner_name,counterparty.partner_code AS counterparty_partner_code,counterparty.display_name AS counterparty_name
        FROM vehicle.ownership_events e JOIN partners.partners owner ON owner.id=e.owner_partner_id
        LEFT JOIN partners.partners counterparty ON counterparty.id=e.counterparty_partner_id
        WHERE e.vehicle_id=$1 ORDER BY e.sequence_no
      `,[vehicleId]),
      this.db.query<any>(`
        SELECT h.*,dealer.partner_code AS dealer_partner_code,dealer.display_name AS dealer_name,customer.partner_code AS customer_partner_code,customer.display_name AS customer_name
        FROM vehicle.handovers h JOIN partners.partners dealer ON dealer.id=h.dealer_partner_id JOIN partners.partners customer ON customer.id=h.customer_partner_id
        WHERE h.vehicle_id=$1 ORDER BY h.handed_over_at,h.created_at
      `,[vehicleId]),
      this.db.query<any>(`SELECT q.* FROM production.qc_inspections q JOIN vehicle.vehicles v ON v.production_unit_id=q.production_unit_id WHERE v.id=$1 ORDER BY q.inspected_at,q.id`,[vehicleId]),
      this.db.query<any>(`
        SELECT d.*,expected.part_number AS expected_part_number,actual.part_number AS actual_part_number
        FROM production.as_built_deviations d
        JOIN engineering.parts expected ON expected.id=d.expected_part_id JOIN engineering.parts actual ON actual.id=d.actual_part_id
        JOIN vehicle.vehicles v ON v.production_unit_id=d.production_unit_id WHERE v.id=$1 ORDER BY d.created_at,d.id
      `,[vehicleId]),
      this.db.query<any>(`
        SELECT sh.id AS shipment_id,sh.shipment_number,sh.route_type,sh.status AS shipment_status,e.event_type,e.occurred_at,e.location_text,e.note,e.metadata
        FROM logistics.shipment_cargo sc JOIN logistics.shipments sh ON sh.id=sc.shipment_id
        LEFT JOIN logistics.shipment_events e ON e.shipment_id=sh.id
        WHERE sc.vehicle_id=$1 ORDER BY COALESCE(e.occurred_at,sh.created_at),e.created_at,e.id
      `,[vehicleId]),
      this.db.query<any>(`
        SELECT m.*,src.code AS source_location_code,src.name AS source_location_name,dst.code AS destination_location_code,dst.name AS destination_location_name,
               sw.code AS source_warehouse_code,dw.code AS destination_warehouse_code
        FROM inventory.movements m
        LEFT JOIN warehouse.locations src ON src.id=m.source_location_id LEFT JOIN warehouse.warehouses sw ON sw.id=src.warehouse_id
        LEFT JOIN warehouse.locations dst ON dst.id=m.destination_location_id LEFT JOIN warehouse.warehouses dw ON dw.id=dst.warehouse_id
        WHERE m.item_kind='VEHICLE' AND m.vehicle_id=$1 ORDER BY m.occurred_at,m.created_at,m.id
      `,[vehicleId]),
    ]);

    return {
      vehicle: base.rows[0],
      lifecycle: lifecycle.rows,
      ownership: ownership.rows,
      handovers: handovers.rows,
      production: { qc: qc.rows, deviations: deviations.rows },
      logistics: logisticsEvents.rows,
      inventory: inventoryMovements.rows,
    };
  }

  async garage(partnerId: string): Promise<any[]> {
    const result = await this.db.query<any>(`
      SELECT v.id,v.vehicle_code,v.frame_number,v.born_at,s.sku,s.name AS sku_name,m.code AS model_code,m.name AS model_name,pf.code AS platform_code,
             co.owned_since,lc.lifecycle_state,h.handover_number,h.handed_over_at,dealer.display_name AS dealer_name
      FROM vehicle.v_current_ownership co
      JOIN vehicle.vehicles v ON v.id=co.vehicle_id
      JOIN product.skus s ON s.id=v.sku_id JOIN product.variants vr ON vr.id=s.variant_id JOIN product.models m ON m.id=vr.model_id JOIN product.platforms pf ON pf.id=m.platform_id
      LEFT JOIN vehicle.v_current_lifecycle lc ON lc.vehicle_id=v.id LEFT JOIN vehicle.handovers h ON h.vehicle_id=v.id LEFT JOIN partners.partners dealer ON dealer.id=h.dealer_partner_id
      WHERE co.owner_partner_id=$1 ORDER BY co.owned_since DESC,v.born_at DESC
    `,[partnerId]);
    return result.rows;
  }

  async lockVehicle(id: string, executor: QueryExecutor): Promise<any | null> {
    const result = await executor.query<any>(`SELECT * FROM vehicle.vehicles WHERE id=$1 FOR UPDATE`,[id]);
    return result.rows[0] ?? null;
  }

  async currentOwner(id: string, executor: QueryExecutor): Promise<any | null> {
    const result = await executor.query<any>(`SELECT * FROM vehicle.v_current_ownership WHERE vehicle_id=$1`,[id]);
    return result.rows[0] ?? null;
  }

  async lockBirthCandidate(id: string, executor: QueryExecutor): Promise<any | null> {
    const result = await executor.query<any>(`SELECT u.id,u.status,u.production_order_id,po.build_spec_id,po.factory_partner_id,bs.sku_id FROM production.production_units u JOIN production.production_orders po ON po.id=u.production_order_id JOIN engineering.build_specs bs ON bs.id=po.build_spec_id WHERE u.id=$1 FOR UPDATE OF u`,[id]);
    return result.rows[0] ?? null;
  }

  async latestQc(id: string, executor: QueryExecutor): Promise<any | null> {
    const result = await executor.query<any>(`SELECT id,result FROM production.qc_inspections WHERE production_unit_id=$1 ORDER BY inspected_at DESC,id DESC LIMIT 1`,[id]);
    return result.rows[0] ?? null;
  }

  async createVehicle(input: { frameNumber: string; unitId: string; productionOrderId: string; buildSpecId: string; skuId: string; factoryPartnerId: string; birthQcInspectionId: string; actorUserId: string }, executor: QueryExecutor): Promise<any> {
    const result = await executor.query<any>(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[input.frameNumber,input.unitId,input.productionOrderId,input.buildSpecId,input.skuId,input.factoryPartnerId,input.birthQcInspectionId,input.actorUserId]);
    return result.rows[0];
  }

  async createHandover(input: { vehicleId: string; dealerPartnerId: string; customerPartnerId: string; handedOverAt: string; reference: string | null; note: string; evidence: Record<string, unknown>; actorUserId: string }, executor: QueryExecutor): Promise<any> {
    const result = await executor.query<any>(`
      INSERT INTO vehicle.handovers(vehicle_id,dealer_partner_id,customer_partner_id,handed_over_at,reference,note,evidence,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING *
    `,[input.vehicleId,input.dealerPartnerId,input.customerPartnerId,input.handedOverAt,input.reference,input.note,JSON.stringify(input.evidence),input.actorUserId]);
    return result.rows[0];
  }

  async appendOwnership(input: { vehicleId: string; eventType: 'ACQUIRED' | 'RELEASED'; ownerPartnerId: string; counterpartyPartnerId: string | null; handoverId: string | null; occurredAt: string; reason: string; metadata: Record<string, unknown>; actorUserId: string }, executor: QueryExecutor): Promise<any> {
    const result = await executor.query<any>(`
      INSERT INTO vehicle.ownership_events(vehicle_id,event_type,owner_partner_id,counterparty_partner_id,handover_id,occurred_at,reason,metadata,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *
    `,[input.vehicleId,input.eventType,input.ownerPartnerId,input.counterpartyPartnerId,input.handoverId,input.occurredAt,input.reason,JSON.stringify(input.metadata),input.actorUserId]);
    return result.rows[0];
  }

  async appendLifecycle(input: { vehicleId: string; state: 'HANDED_OVER' | 'OWNED' | 'UNOWNED' | 'RETIRED'; eventType: 'CUSTOMER_HANDOVER' | 'OWNERSHIP_ACQUIRED' | 'OWNERSHIP_RELEASED' | 'OWNERSHIP_TRANSFERRED' | 'RETIRED'; sourceType: 'HANDOVER' | 'OWNERSHIP'; sourceId: string | null; occurredAt: string; note: string; metadata: Record<string, unknown>; actorUserId: string }, executor: QueryExecutor): Promise<any> {
    const result = await executor.query<any>(`
      INSERT INTO vehicle.lifecycle_events(vehicle_id,state,event_type,source_type,source_id,occurred_at,note,metadata,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *
    `,[input.vehicleId,input.state,input.eventType,input.sourceType,input.sourceId,input.occurredAt,input.note,JSON.stringify(input.metadata),input.actorUserId]);
    return result.rows[0];
  }
}
