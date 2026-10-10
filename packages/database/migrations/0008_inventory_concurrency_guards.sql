CREATE OR REPLACE FUNCTION inventory.position_lock_key(
  p_item_kind text,
  p_part_id uuid,
  p_sku_id uuid,
  p_vehicle_id uuid,
  p_location_id uuid,
  p_unit text
) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT concat_ws(':',
    'inventory-position',
    p_item_kind,
    COALESCE(p_part_id::text, p_sku_id::text, p_vehicle_id::text),
    p_location_id::text,
    upper(p_unit)
  );
$$;

CREATE OR REPLACE FUNCTION inventory.lock_movement_positions() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  source_key text;
  destination_key text;
  first_key text;
  second_key text;
BEGIN
  -- A serialized Vehicle is globally unique in Inventory, so all concurrent
  -- operations for one Vehicle also share a Vehicle-level lock across locations.
  IF NEW.vehicle_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('inventory-vehicle:' || NEW.vehicle_id::text, 0));
  END IF;

  IF NEW.source_location_id IS NOT NULL THEN
    source_key := inventory.position_lock_key(NEW.item_kind, NEW.part_id, NEW.sku_id, NEW.vehicle_id, NEW.source_location_id, NEW.unit);
  END IF;
  IF NEW.destination_location_id IS NOT NULL THEN
    destination_key := inventory.position_lock_key(NEW.item_kind, NEW.part_id, NEW.sku_id, NEW.vehicle_id, NEW.destination_location_id, NEW.unit);
  END IF;

  IF source_key IS NOT NULL AND destination_key IS NOT NULL THEN
    IF source_key <= destination_key THEN first_key := source_key; second_key := destination_key;
    ELSE first_key := destination_key; second_key := source_key;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(first_key, 0));
    IF second_key IS DISTINCT FROM first_key THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(second_key, 0));
    END IF;
  ELSIF source_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(source_key, 0));
  ELSIF destination_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(destination_key, 0));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_00_movement_position_lock
BEFORE INSERT ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION inventory.lock_movement_positions();

CREATE OR REPLACE FUNCTION inventory.lock_reservation_position() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE key text;
BEGIN
  IF NEW.vehicle_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('inventory-vehicle:' || NEW.vehicle_id::text, 0));
  END IF;
  key := inventory.position_lock_key(NEW.item_kind, NEW.part_id, NEW.sku_id, NEW.vehicle_id, NEW.location_id, NEW.unit);
  PERFORM pg_advisory_xact_lock(hashtextextended(key, 0));
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_00_reservation_position_lock
BEFORE INSERT ON inventory.reservations
FOR EACH ROW EXECUTE FUNCTION inventory.lock_reservation_position();
