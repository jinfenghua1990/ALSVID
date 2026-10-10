CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS inventory;

INSERT INTO identity.permissions(id, description) VALUES
  ('inventory.read', 'View inventory balances, movements, reservations and warehouse state'),
  ('inventory.move', 'Post normal inventory receipts, transfers, issues and returns'),
  ('inventory.reserve', 'Create, release and consume inventory reservations'),
  ('inventory.stocktake', 'Open, count and close warehouse stocktakes'),
  ('inventory.adjust', 'Post privileged inventory adjustments'),
  ('warehouse.manage', 'Create and manage warehouses and locations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('inventory_manager', 'Inventory manager', 'Manage warehouses, stock movements, reservations and stocktakes'),
  ('warehouse_operator', 'Warehouse operator', 'Receive, move, reserve and count physical stock'),
  ('inventory_viewer', 'Inventory viewer', 'Read-only inventory and warehouse visibility')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('inventory_manager', 'inventory.read'),
  ('inventory_manager', 'inventory.move'),
  ('inventory_manager', 'inventory.reserve'),
  ('inventory_manager', 'inventory.stocktake'),
  ('inventory_manager', 'inventory.adjust'),
  ('inventory_manager', 'warehouse.manage'),
  ('warehouse_operator', 'inventory.read'),
  ('warehouse_operator', 'inventory.move'),
  ('warehouse_operator', 'inventory.reserve'),
  ('warehouse_operator', 'inventory.stocktake'),
  ('inventory_viewer', 'inventory.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions
WHERE id IN ('inventory.read','inventory.move','inventory.reserve','inventory.stocktake','inventory.adjust','warehouse.manage')
ON CONFLICT DO NOTHING;

CREATE SEQUENCE warehouse.stocktake_number_seq START 1;
CREATE SEQUENCE inventory.movement_number_seq START 1;

CREATE TABLE warehouse.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  country_code text NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  timezone text NOT NULL DEFAULT 'UTC' CHECK (length(trim(timezone)) > 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code = upper(code)),
  CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$')
);
CREATE INDEX warehouses_partner_idx ON warehouse.warehouses(partner_id) WHERE partner_id IS NOT NULL;

CREATE TABLE warehouse.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouse.warehouses(id) ON DELETE RESTRICT,
  parent_location_id uuid REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  location_type text NOT NULL CHECK (location_type IN ('RECEIVING','STORAGE','STAGING','PICK','QUARANTINE','DISPATCH')),
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, code),
  CHECK (code = upper(code)),
  CHECK (code ~ '^[A-Z0-9][A-Z0-9_.-]{0,63}$')
);
CREATE INDEX warehouse_locations_parent_idx ON warehouse.locations(parent_location_id) WHERE parent_location_id IS NOT NULL;

CREATE TABLE warehouse.stocktake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_number text NOT NULL UNIQUE DEFAULT ('ST-' || lpad(nextval('warehouse.stocktake_number_seq')::text, 8, '0')),
  warehouse_id uuid NOT NULL REFERENCES warehouse.warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','CANCELLED')),
  note text NOT NULL DEFAULT '',
  opened_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  closed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stocktake_sessions_status_idx ON warehouse.stocktake_sessions(status, opened_at DESC);

CREATE TABLE warehouse.stocktake_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES warehouse.stocktake_sessions(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  item_kind text NOT NULL CHECK (item_kind IN ('PART','SKU','VEHICLE')),
  part_id uuid REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  vehicle_id uuid REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
  counted_quantity numeric(18,6) NOT NULL CHECK (counted_quantity >= 0),
  unit text NOT NULL CHECK (length(trim(unit)) > 0),
  counted_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  counted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (item_kind='PART' AND part_id IS NOT NULL AND sku_id IS NULL AND vehicle_id IS NULL) OR
    (item_kind='SKU' AND part_id IS NULL AND sku_id IS NOT NULL AND vehicle_id IS NULL) OR
    (item_kind='VEHICLE' AND part_id IS NULL AND sku_id IS NULL AND vehicle_id IS NOT NULL)
  ),
  CHECK (item_kind <> 'VEHICLE' OR (counted_quantity IN (0,1) AND upper(unit)='EA'))
);
CREATE INDEX stocktake_counts_session_idx ON warehouse.stocktake_counts(session_id, counted_at DESC, id DESC);
CREATE INDEX stocktake_counts_location_idx ON warehouse.stocktake_counts(location_id, counted_at DESC);

CREATE TABLE inventory.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_kind text NOT NULL CHECK (item_kind IN ('PART','SKU','VEHICLE')),
  part_id uuid REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  vehicle_id uuid REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (length(trim(unit)) > 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RELEASED','CONSUMED','CANCELLED')),
  reference_type text,
  reference_id uuid,
  note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  consumed_at timestamptz,
  CHECK (
    (item_kind='PART' AND part_id IS NOT NULL AND sku_id IS NULL AND vehicle_id IS NULL) OR
    (item_kind='SKU' AND part_id IS NULL AND sku_id IS NOT NULL AND vehicle_id IS NULL) OR
    (item_kind='VEHICLE' AND part_id IS NULL AND sku_id IS NULL AND vehicle_id IS NOT NULL)
  ),
  CHECK (item_kind <> 'VEHICLE' OR (quantity=1 AND upper(unit)='EA'))
);
CREATE INDEX inventory_reservations_active_idx ON inventory.reservations(location_id, item_kind, status) WHERE status='ACTIVE';
CREATE UNIQUE INDEX inventory_vehicle_active_reservation_uq ON inventory.reservations(vehicle_id) WHERE item_kind='VEHICLE' AND status='ACTIVE';

CREATE TABLE inventory.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_number text NOT NULL UNIQUE DEFAULT ('IM-' || lpad(nextval('inventory.movement_number_seq')::text, 10, '0')),
  movement_type text NOT NULL CHECK (movement_type IN ('RECEIPT','TRANSFER','ISSUE','RETURN','ADJUSTMENT','STOCKTAKE_CORRECTION')),
  item_kind text NOT NULL CHECK (item_kind IN ('PART','SKU','VEHICLE')),
  part_id uuid REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  vehicle_id uuid REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (length(trim(unit)) > 0),
  source_location_id uuid REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  destination_location_id uuid REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES inventory.reservations(id) ON DELETE RESTRICT,
  reference_type text,
  reference_id uuid,
  reason text NOT NULL DEFAULT '',
  idempotency_key text NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) > 0),
  correlation_id text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (item_kind='PART' AND part_id IS NOT NULL AND sku_id IS NULL AND vehicle_id IS NULL) OR
    (item_kind='SKU' AND part_id IS NULL AND sku_id IS NOT NULL AND vehicle_id IS NULL) OR
    (item_kind='VEHICLE' AND part_id IS NULL AND sku_id IS NULL AND vehicle_id IS NOT NULL)
  ),
  CHECK (item_kind <> 'VEHICLE' OR (quantity=1 AND upper(unit)='EA')),
  CHECK (source_location_id IS NULL OR destination_location_id IS NULL OR source_location_id <> destination_location_id)
);
CREATE INDEX inventory_movements_source_idx ON inventory.movements(source_location_id, occurred_at DESC) WHERE source_location_id IS NOT NULL;
CREATE INDEX inventory_movements_destination_idx ON inventory.movements(destination_location_id, occurred_at DESC) WHERE destination_location_id IS NOT NULL;
CREATE INDEX inventory_movements_item_idx ON inventory.movements(item_kind, part_id, sku_id, vehicle_id, occurred_at DESC);
CREATE INDEX inventory_movements_reservation_idx ON inventory.movements(reservation_id) WHERE reservation_id IS NOT NULL;

CREATE VIEW inventory.v_location_balances AS
SELECT item_kind, part_id, sku_id, vehicle_id, location_id, unit, sum(quantity_delta)::numeric(18,6) AS on_hand
FROM (
  SELECT item_kind, part_id, sku_id, vehicle_id, destination_location_id AS location_id, unit, quantity AS quantity_delta
  FROM inventory.movements WHERE destination_location_id IS NOT NULL
  UNION ALL
  SELECT item_kind, part_id, sku_id, vehicle_id, source_location_id AS location_id, unit, -quantity AS quantity_delta
  FROM inventory.movements WHERE source_location_id IS NOT NULL
) d
GROUP BY item_kind, part_id, sku_id, vehicle_id, location_id, unit
HAVING sum(quantity_delta) <> 0;

CREATE VIEW inventory.v_active_reservations AS
SELECT item_kind, part_id, sku_id, vehicle_id, location_id, unit, sum(quantity)::numeric(18,6) AS reserved
FROM inventory.reservations
WHERE status='ACTIVE'
GROUP BY item_kind, part_id, sku_id, vehicle_id, location_id, unit;

CREATE VIEW inventory.v_availability AS
SELECT b.item_kind,b.part_id,b.sku_id,b.vehicle_id,b.location_id,b.unit,b.on_hand,
       COALESCE(r.reserved,0)::numeric(18,6) AS reserved,
       (b.on_hand-COALESCE(r.reserved,0))::numeric(18,6) AS available
FROM inventory.v_location_balances b
LEFT JOIN inventory.v_active_reservations r
  ON r.item_kind=b.item_kind
 AND r.part_id IS NOT DISTINCT FROM b.part_id
 AND r.sku_id IS NOT DISTINCT FROM b.sku_id
 AND r.vehicle_id IS NOT DISTINCT FROM b.vehicle_id
 AND r.location_id=b.location_id
 AND upper(r.unit)=upper(b.unit);

CREATE OR REPLACE FUNCTION warehouse.validate_location_parent() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_warehouse uuid;
BEGIN
  IF NEW.parent_location_id IS NULL THEN RETURN NEW; END IF;
  SELECT warehouse_id INTO parent_warehouse FROM warehouse.locations WHERE id=NEW.parent_location_id;
  IF parent_warehouse IS NULL OR parent_warehouse IS DISTINCT FROM NEW.warehouse_id THEN
    RAISE EXCEPTION 'Parent location must belong to the same warehouse';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER warehouse_location_parent_guard
BEFORE INSERT OR UPDATE OF warehouse_id,parent_location_id ON warehouse.locations
FOR EACH ROW EXECUTE FUNCTION warehouse.validate_location_parent();

CREATE OR REPLACE FUNCTION warehouse.validate_stocktake_count() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE session_status text; session_warehouse uuid; location_warehouse uuid;
BEGIN
  SELECT status,warehouse_id INTO session_status,session_warehouse FROM warehouse.stocktake_sessions WHERE id=NEW.session_id;
  SELECT warehouse_id INTO location_warehouse FROM warehouse.locations WHERE id=NEW.location_id;
  IF session_status IS DISTINCT FROM 'OPEN' THEN RAISE EXCEPTION 'Stocktake session must be OPEN'; END IF;
  IF location_warehouse IS DISTINCT FROM session_warehouse THEN RAISE EXCEPTION 'Stocktake location must belong to the session warehouse'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER warehouse_stocktake_count_guard
BEFORE INSERT ON warehouse.stocktake_counts
FOR EACH ROW EXECUTE FUNCTION warehouse.validate_stocktake_count();

CREATE OR REPLACE FUNCTION warehouse.reject_stocktake_count_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Stocktake count evidence is append-only';
END;
$$;
CREATE TRIGGER warehouse_stocktake_count_no_mutation
BEFORE UPDATE OR DELETE ON warehouse.stocktake_counts
FOR EACH ROW EXECUTE FUNCTION warehouse.reject_stocktake_count_mutation();

CREATE OR REPLACE FUNCTION warehouse.validate_stocktake_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF OLD.status <> 'OPEN' OR NEW.status NOT IN ('CLOSED','CANCELLED') THEN
    RAISE EXCEPTION 'Invalid stocktake transition: % -> %',OLD.status,NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER warehouse_stocktake_transition_guard
BEFORE UPDATE OF status ON warehouse.stocktake_sessions
FOR EACH ROW EXECUTE FUNCTION warehouse.validate_stocktake_transition();

CREATE OR REPLACE FUNCTION inventory.validate_movement_semantics() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE current_vehicle_location uuid;
BEGIN
  NEW.unit := upper(trim(NEW.unit));
  IF NEW.movement_type IN ('RECEIPT','RETURN') THEN
    IF NEW.source_location_id IS NOT NULL OR NEW.destination_location_id IS NULL THEN
      RAISE EXCEPTION '% requires destination only',NEW.movement_type;
    END IF;
  ELSIF NEW.movement_type='TRANSFER' THEN
    IF NEW.source_location_id IS NULL OR NEW.destination_location_id IS NULL THEN RAISE EXCEPTION 'TRANSFER requires source and destination'; END IF;
  ELSIF NEW.movement_type='ISSUE' THEN
    IF NEW.source_location_id IS NULL OR NEW.destination_location_id IS NOT NULL THEN RAISE EXCEPTION 'ISSUE requires source only'; END IF;
  ELSIF NEW.movement_type IN ('ADJUSTMENT','STOCKTAKE_CORRECTION') THEN
    IF (NEW.source_location_id IS NULL) = (NEW.destination_location_id IS NULL) THEN RAISE EXCEPTION '% requires exactly one location side',NEW.movement_type; END IF;
  END IF;

  IF NEW.reservation_id IS NOT NULL AND NEW.movement_type <> 'ISSUE' THEN
    RAISE EXCEPTION 'Reservation-backed movement must be ISSUE';
  END IF;

  IF NEW.item_kind='VEHICLE' THEN
    SELECT location_id INTO current_vehicle_location
    FROM inventory.v_location_balances
    WHERE item_kind='VEHICLE' AND vehicle_id=NEW.vehicle_id AND on_hand > 0
    LIMIT 1;
    IF NEW.source_location_id IS NULL THEN
      IF current_vehicle_location IS NOT NULL THEN RAISE EXCEPTION 'Vehicle is already present in inventory'; END IF;
    ELSIF current_vehicle_location IS DISTINCT FROM NEW.source_location_id THEN
      RAISE EXCEPTION 'Vehicle source location does not match current inventory location';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_movement_semantics_guard
BEFORE INSERT ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION inventory.validate_movement_semantics();

CREATE OR REPLACE FUNCTION inventory.guard_source_stock() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE current_on_hand numeric(18,6); current_reserved numeric(18,6); reservation_row inventory.reservations%ROWTYPE;
BEGIN
  IF NEW.source_location_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(sum(on_hand),0) INTO current_on_hand FROM inventory.v_location_balances
  WHERE item_kind=NEW.item_kind
    AND part_id IS NOT DISTINCT FROM NEW.part_id
    AND sku_id IS NOT DISTINCT FROM NEW.sku_id
    AND vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
    AND location_id=NEW.source_location_id
    AND upper(unit)=upper(NEW.unit);
  IF current_on_hand < NEW.quantity THEN RAISE EXCEPTION 'Movement would create negative stock'; END IF;

  IF NEW.reservation_id IS NOT NULL THEN
    SELECT * INTO reservation_row FROM inventory.reservations WHERE id=NEW.reservation_id FOR UPDATE;
    IF reservation_row.id IS NULL OR reservation_row.status <> 'ACTIVE' OR
       reservation_row.item_kind <> NEW.item_kind OR
       reservation_row.part_id IS DISTINCT FROM NEW.part_id OR
       reservation_row.sku_id IS DISTINCT FROM NEW.sku_id OR
       reservation_row.vehicle_id IS DISTINCT FROM NEW.vehicle_id OR
       reservation_row.location_id IS DISTINCT FROM NEW.source_location_id OR
       upper(reservation_row.unit) <> upper(NEW.unit) OR reservation_row.quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Movement does not match active reservation';
    END IF;
  ELSE
    SELECT COALESCE(sum(quantity),0) INTO current_reserved FROM inventory.reservations
    WHERE status='ACTIVE' AND item_kind=NEW.item_kind
      AND part_id IS NOT DISTINCT FROM NEW.part_id
      AND sku_id IS NOT DISTINCT FROM NEW.sku_id
      AND vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
      AND location_id=NEW.source_location_id
      AND upper(unit)=upper(NEW.unit);
    IF current_on_hand-current_reserved < NEW.quantity THEN RAISE EXCEPTION 'Movement would consume reserved stock'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_movement_stock_guard
BEFORE INSERT ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION inventory.guard_source_stock();

CREATE OR REPLACE FUNCTION inventory.consume_reservation_after_issue() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reservation_id IS NOT NULL THEN
    UPDATE inventory.reservations
    SET status='CONSUMED',consumed_at=now(),updated_at=now(),updated_by=NEW.created_by,version=version+1
    WHERE id=NEW.reservation_id AND status='ACTIVE';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_issue_consumes_reservation
AFTER INSERT ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION inventory.consume_reservation_after_issue();

CREATE OR REPLACE FUNCTION inventory.validate_reservation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE current_on_hand numeric(18,6); current_reserved numeric(18,6);
BEGIN
  NEW.unit := upper(trim(NEW.unit));
  SELECT COALESCE(sum(on_hand),0) INTO current_on_hand FROM inventory.v_location_balances
  WHERE item_kind=NEW.item_kind
    AND part_id IS NOT DISTINCT FROM NEW.part_id
    AND sku_id IS NOT DISTINCT FROM NEW.sku_id
    AND vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
    AND location_id=NEW.location_id
    AND upper(unit)=upper(NEW.unit);
  SELECT COALESCE(sum(quantity),0) INTO current_reserved FROM inventory.reservations
  WHERE status='ACTIVE' AND item_kind=NEW.item_kind
    AND part_id IS NOT DISTINCT FROM NEW.part_id
    AND sku_id IS NOT DISTINCT FROM NEW.sku_id
    AND vehicle_id IS NOT DISTINCT FROM NEW.vehicle_id
    AND location_id=NEW.location_id
    AND upper(unit)=upper(NEW.unit);
  IF current_on_hand-current_reserved < NEW.quantity THEN RAISE EXCEPTION 'Insufficient available stock for reservation'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_reservation_availability_guard
BEFORE INSERT ON inventory.reservations
FOR EACH ROW EXECUTE FUNCTION inventory.validate_reservation();

CREATE OR REPLACE FUNCTION inventory.protect_reservation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Inventory reservations are retained as history'; END IF;
  IF NEW.item_kind IS DISTINCT FROM OLD.item_kind OR NEW.part_id IS DISTINCT FROM OLD.part_id OR NEW.sku_id IS DISTINCT FROM OLD.sku_id OR
     NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id OR NEW.location_id IS DISTINCT FROM OLD.location_id OR NEW.quantity IS DISTINCT FROM OLD.quantity OR
     NEW.unit IS DISTINCT FROM OLD.unit OR NEW.reference_type IS DISTINCT FROM OLD.reference_type OR NEW.reference_id IS DISTINCT FROM OLD.reference_id THEN
    RAISE EXCEPTION 'Reservation baseline is immutable';
  END IF;
  IF NEW.status <> OLD.status AND NOT (OLD.status='ACTIVE' AND NEW.status IN ('RELEASED','CONSUMED','CANCELLED')) THEN
    RAISE EXCEPTION 'Invalid reservation transition: % -> %',OLD.status,NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_reservation_guard
BEFORE UPDATE OR DELETE ON inventory.reservations
FOR EACH ROW EXECUTE FUNCTION inventory.protect_reservation();

CREATE OR REPLACE FUNCTION inventory.reject_movement_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Inventory movement ledger is append-only';
END;
$$;
CREATE TRIGGER inventory_movement_no_mutation
BEFORE UPDATE OR DELETE ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION inventory.reject_movement_mutation();
