CREATE OR REPLACE FUNCTION logistics.validate_shipment_geography() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE origin_country text; destination_country text;
BEGIN
  SELECT w.country_code INTO origin_country
  FROM warehouse.locations l JOIN warehouse.warehouses w ON w.id=l.warehouse_id
  WHERE l.id=NEW.origin_location_id;
  IF origin_country IS DISTINCT FROM 'CN' THEN
    RAISE EXCEPTION 'Export Logistics origin location must belong to a China warehouse';
  END IF;

  IF NEW.route_type='FACTORY_TO_GERMANY_WAREHOUSE' THEN
    SELECT w.country_code INTO destination_country
    FROM warehouse.locations l JOIN warehouse.warehouses w ON w.id=l.warehouse_id
    WHERE l.id=NEW.destination_location_id;
    IF destination_country IS DISTINCT FROM 'DE' THEN
      RAISE EXCEPTION 'Germany route destination must belong to a Germany warehouse';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_shipment_geography_guard
BEFORE INSERT OR UPDATE OF route_type,origin_location_id,destination_location_id ON logistics.shipments
FOR EACH ROW EXECUTE FUNCTION logistics.validate_shipment_geography();

CREATE OR REPLACE FUNCTION logistics.protect_customs_declaration() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE latest_status text;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Customs declarations are retained as history'; END IF;
  SELECT event_type INTO latest_status FROM logistics.customs_events
  WHERE declaration_id=OLD.id ORDER BY occurred_at DESC,created_at DESC,id DESC LIMIT 1;
  IF latest_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'Customs declaration header is immutable after declaration';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_customs_declaration_guard
BEFORE UPDATE OR DELETE ON logistics.customs_declarations
FOR EACH ROW EXECUTE FUNCTION logistics.protect_customs_declaration();

CREATE OR REPLACE FUNCTION logistics.validate_receiving_handoff() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  route text;
  shipment_destination uuid;
  cargo_shipment uuid;
  movement_destination uuid;
  movement_reference_type text;
  movement_reference_id uuid;
BEGIN
  SELECT route_type,destination_location_id INTO route,shipment_destination FROM logistics.shipments WHERE id=NEW.shipment_id;
  IF route IS DISTINCT FROM 'FACTORY_TO_GERMANY_WAREHOUSE' THEN
    RAISE EXCEPTION 'Dealer-direct shipment cannot create a Germany receiving handoff';
  END IF;
  IF shipment_destination IS DISTINCT FROM NEW.destination_location_id THEN
    RAISE EXCEPTION 'Receiving handoff must use the shipment Germany destination location';
  END IF;
  SELECT shipment_id INTO cargo_shipment FROM logistics.shipment_cargo WHERE id=NEW.cargo_id;
  IF cargo_shipment IS DISTINCT FROM NEW.shipment_id THEN
    RAISE EXCEPTION 'Receiving handoff cargo must belong to the shipment';
  END IF;
  SELECT destination_location_id,reference_type,reference_id INTO movement_destination,movement_reference_type,movement_reference_id
  FROM inventory.movements WHERE id=NEW.inventory_movement_id;
  IF movement_destination IS DISTINCT FROM NEW.destination_location_id OR movement_reference_type IS DISTINCT FROM 'SHIPMENT' OR movement_reference_id IS DISTINCT FROM NEW.shipment_id THEN
    RAISE EXCEPTION 'Receiving handoff Inventory movement must be the shipment receipt into the Germany destination';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_receiving_handoff_guard
BEFORE INSERT ON logistics.receiving_handoffs
FOR EACH ROW EXECUTE FUNCTION logistics.validate_receiving_handoff();

CREATE OR REPLACE FUNCTION logistics.validate_inventory_received_marker() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE cargo_count integer; handoff_count integer;
BEGIN
  IF OLD.inventory_received_at IS NOT NULL AND NEW.inventory_received_at IS DISTINCT FROM OLD.inventory_received_at THEN
    RAISE EXCEPTION 'Shipment Inventory receiving marker is immutable';
  END IF;
  IF NEW.inventory_received_at IS NOT NULL AND OLD.inventory_received_at IS NULL THEN
    IF NEW.route_type <> 'FACTORY_TO_GERMANY_WAREHOUSE' OR NEW.status <> 'DELIVERED' THEN
      RAISE EXCEPTION 'Only delivered Germany-route shipments can be marked received into Inventory';
    END IF;
    SELECT count(*)::int INTO cargo_count FROM logistics.shipment_cargo WHERE shipment_id=NEW.id;
    SELECT count(*)::int INTO handoff_count FROM logistics.receiving_handoffs WHERE shipment_id=NEW.id;
    IF cargo_count=0 OR handoff_count <> cargo_count THEN
      RAISE EXCEPTION 'Every shipment cargo line requires an Inventory receiving handoff';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_inventory_received_marker_guard
BEFORE UPDATE OF inventory_received_at ON logistics.shipments
FOR EACH ROW EXECUTE FUNCTION logistics.validate_inventory_received_marker();
