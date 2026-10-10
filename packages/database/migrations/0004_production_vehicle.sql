CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS vehicle;

INSERT INTO identity.permissions(id, description) VALUES
  ('production.read', 'View production orders, units and QC facts'),
  ('production.write', 'Create and operate production orders and as-built evidence'),
  ('production.release', 'Release and complete production orders'),
  ('qc.inspect', 'Record QC inspections and dispositions'),
  ('vehicle.read', 'View Vehicle birth and identity facts'),
  ('vehicle.birth', 'Create a Vehicle identity from a QC-passed production unit')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('production_manager', 'Production manager', 'Manage factory production execution'),
  ('qc_inspector', 'QC inspector', 'Record production quality inspections'),
  ('vehicle_manager', 'Vehicle manager', 'Create and view physical Vehicle identities'),
  ('production_viewer', 'Production viewer', 'Read-only production and Vehicle access')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('production_manager', 'production.read'),
  ('production_manager', 'production.write'),
  ('production_manager', 'production.release'),
  ('production_manager', 'vehicle.read'),
  ('qc_inspector', 'production.read'),
  ('qc_inspector', 'qc.inspect'),
  ('qc_inspector', 'vehicle.read'),
  ('vehicle_manager', 'production.read'),
  ('vehicle_manager', 'vehicle.read'),
  ('vehicle_manager', 'vehicle.birth'),
  ('production_viewer', 'production.read'),
  ('production_viewer', 'vehicle.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions
WHERE id IN ('production.read','production.write','production.release','qc.inspect','vehicle.read','vehicle.birth')
ON CONFLICT DO NOTHING;

CREATE SEQUENCE production.production_order_number_seq START 1;
CREATE SEQUENCE vehicle.vehicle_code_seq START 1;

CREATE TABLE production.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_number text NOT NULL UNIQUE DEFAULT ('MO-' || lpad(nextval('production.production_order_number_seq')::text, 8, '0')),
  build_spec_id uuid NOT NULL REFERENCES engineering.build_specs(id) ON DELETE RESTRICT,
  factory_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
  source_purchase_order_id uuid REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
  planned_quantity integer NOT NULL CHECK (planned_quantity > 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RELEASED','IN_PROGRESS','QC_PENDING','COMPLETED','CANCELLED')),
  planned_start_date date,
  planned_completion_date date,
  released_at timestamptz,
  started_at timestamptz,
  qc_pending_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_orders_status_idx ON production.production_orders(status, created_at DESC);
CREATE INDEX production_orders_factory_idx ON production.production_orders(factory_partner_id, created_at DESC);

CREATE TABLE production.production_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production.production_orders(id) ON DELETE RESTRICT,
  unit_no integer NOT NULL CHECK (unit_no > 0),
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','ASSEMBLING','ASSEMBLED','QC_PENDING','QC_PASSED','QC_FAILED','HOLD')),
  assembly_started_at timestamptz,
  assembly_completed_at timestamptz,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_order_id, unit_no)
);
CREATE INDEX production_units_order_status_idx ON production.production_units(production_order_id, status, unit_no);

CREATE TABLE production.as_built_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_unit_id uuid NOT NULL REFERENCES production.production_units(id) ON DELETE RESTRICT,
  expected_part_id uuid NOT NULL REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  actual_part_id uuid NOT NULL REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  serial_number text,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  approved_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_deviations_unit_idx ON production.as_built_deviations(production_unit_id, created_at);

CREATE TABLE production.qc_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_unit_id uuid NOT NULL REFERENCES production.production_units(id) ON DELETE RESTRICT,
  result text NOT NULL CHECK (result IN ('PASS','FAIL','HOLD')),
  checklist_code text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text NOT NULL DEFAULT '',
  inspected_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  inspected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_qc_unit_idx ON production.qc_inspections(production_unit_id, inspected_at DESC, id DESC);

CREATE TABLE production.order_state_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES production.production_orders(id) ON DELETE RESTRICT,
  from_status text NOT NULL,
  to_status text NOT NULL,
  order_version integer NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_order_history_idx ON production.order_state_history(production_order_id, occurred_at);

CREATE TABLE vehicle.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_code text NOT NULL UNIQUE DEFAULT ('V-' || lpad(nextval('vehicle.vehicle_code_seq')::text, 10, '0')),
  frame_number text NOT NULL UNIQUE,
  production_unit_id uuid NOT NULL UNIQUE REFERENCES production.production_units(id) ON DELETE RESTRICT,
  production_order_id uuid NOT NULL REFERENCES production.production_orders(id) ON DELETE RESTRICT,
  build_spec_id uuid NOT NULL REFERENCES engineering.build_specs(id) ON DELETE RESTRICT,
  sku_id uuid NOT NULL REFERENCES product.skus(id) ON DELETE RESTRICT,
  factory_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
  birth_qc_inspection_id uuid NOT NULL REFERENCES production.qc_inspections(id) ON DELETE RESTRICT,
  lifecycle_state text NOT NULL DEFAULT 'BORN' CHECK (lifecycle_state IN ('BORN')),
  born_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (frame_number = upper(frame_number)),
  CHECK (frame_number ~ '^[A-Z0-9][A-Z0-9-]{3,63}$')
);
CREATE INDEX vehicle_birth_date_idx ON vehicle.vehicles(born_at DESC);
CREATE INDEX vehicle_sku_idx ON vehicle.vehicles(sku_id, born_at DESC);

CREATE OR REPLACE FUNCTION production.require_factory_partner() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM partners.roles r
    WHERE r.partner_id = NEW.factory_partner_id AND r.enabled = true AND r.role = 'FACTORY'
  ) THEN
    RAISE EXCEPTION 'Production factory must have FACTORY Partner role';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_order_factory_role
BEFORE INSERT OR UPDATE OF factory_partner_id ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION production.require_factory_partner();

CREATE OR REPLACE FUNCTION production.require_released_build_spec() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE spec_status text;
BEGIN
  SELECT status INTO spec_status FROM engineering.build_specs WHERE id = NEW.build_spec_id;
  IF spec_status IS DISTINCT FROM 'RELEASED' THEN
    RAISE EXCEPTION 'Production Order requires a released Build Specification';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_order_released_build_spec
BEFORE INSERT OR UPDATE OF build_spec_id ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION production.require_released_build_spec();

CREATE OR REPLACE FUNCTION production.validate_source_po() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE po_status text;
BEGIN
  IF NEW.source_purchase_order_id IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO po_status FROM procurement.purchase_orders WHERE id = NEW.source_purchase_order_id;
  IF po_status IS NULL THEN RAISE EXCEPTION 'Source purchase order does not exist'; END IF;
  IF po_status NOT IN ('CONFIRMED','PARTIALLY_FULFILLED','FULFILLED') THEN
    RAISE EXCEPTION 'Production source purchase order must be confirmed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_order_source_po_guard
BEFORE INSERT OR UPDATE OF source_purchase_order_id ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION production.validate_source_po();

CREATE OR REPLACE FUNCTION production.validate_order_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status = 'DRAFT' AND NEW.status IN ('RELEASED','CANCELLED')) OR
    (OLD.status = 'RELEASED' AND NEW.status IN ('IN_PROGRESS','CANCELLED')) OR
    (OLD.status = 'IN_PROGRESS' AND NEW.status IN ('QC_PENDING','CANCELLED')) OR
    (OLD.status = 'QC_PENDING' AND NEW.status IN ('COMPLETED','CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Invalid production order transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_order_transition_guard
BEFORE UPDATE OF status ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION production.validate_order_transition();

CREATE OR REPLACE FUNCTION production.protect_released_order_baseline() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
    NEW.build_spec_id IS DISTINCT FROM OLD.build_spec_id OR
    NEW.factory_partner_id IS DISTINCT FROM OLD.factory_partner_id OR
    NEW.source_purchase_order_id IS DISTINCT FROM OLD.source_purchase_order_id OR
    NEW.planned_quantity IS DISTINCT FROM OLD.planned_quantity
  ) THEN
    RAISE EXCEPTION 'Released Production Order baseline is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_order_baseline_guard
BEFORE UPDATE ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION production.protect_released_order_baseline();

CREATE OR REPLACE FUNCTION production.capture_order_state() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO production.order_state_history(production_order_id,from_status,to_status,order_version)
    VALUES (NEW.id,OLD.status,NEW.status,NEW.version);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_order_state_history
AFTER UPDATE OF status ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION production.capture_order_state();

CREATE OR REPLACE FUNCTION production.validate_unit_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status = 'PLANNED' AND NEW.status IN ('ASSEMBLING','ASSEMBLED')) OR
    (OLD.status = 'ASSEMBLING' AND NEW.status = 'ASSEMBLED') OR
    (OLD.status = 'ASSEMBLED' AND NEW.status = 'QC_PENDING') OR
    (OLD.status = 'QC_PENDING' AND NEW.status IN ('QC_PASSED','QC_FAILED','HOLD')) OR
    (OLD.status IN ('QC_FAILED','HOLD') AND NEW.status = 'QC_PENDING')
  ) THEN
    RAISE EXCEPTION 'Invalid production unit transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_unit_transition_guard
BEFORE UPDATE OF status ON production.production_units
FOR EACH ROW EXECUTE FUNCTION production.validate_unit_transition();

CREATE OR REPLACE FUNCTION production.reject_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Production evidence is append-only';
END;
$$;
CREATE TRIGGER production_deviation_no_mutation
BEFORE UPDATE OR DELETE ON production.as_built_deviations
FOR EACH ROW EXECUTE FUNCTION production.reject_evidence_mutation();
CREATE TRIGGER production_qc_no_mutation
BEFORE UPDATE OR DELETE ON production.qc_inspections
FOR EACH ROW EXECUTE FUNCTION production.reject_evidence_mutation();
CREATE TRIGGER production_history_no_mutation
BEFORE UPDATE OR DELETE ON production.order_state_history
FOR EACH ROW EXECUTE FUNCTION production.reject_evidence_mutation();

CREATE OR REPLACE FUNCTION production.validate_qc_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE unit_status text;
BEGIN
  SELECT status INTO unit_status FROM production.production_units WHERE id = NEW.production_unit_id;
  IF unit_status IS NULL THEN RAISE EXCEPTION 'Production unit does not exist'; END IF;
  IF unit_status NOT IN ('QC_PENDING','QC_FAILED','HOLD') THEN
    RAISE EXCEPTION 'QC inspection requires a unit in QC_PENDING, QC_FAILED or HOLD';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_qc_insert_guard
BEFORE INSERT ON production.qc_inspections
FOR EACH ROW EXECUTE FUNCTION production.validate_qc_insert();

CREATE OR REPLACE FUNCTION vehicle.validate_birth() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  unit_status text;
  expected_order uuid;
  expected_spec uuid;
  expected_sku uuid;
  expected_factory uuid;
  qc_unit uuid;
  qc_result text;
  latest_qc uuid;
BEGIN
  SELECT u.status, po.id, po.build_spec_id, bs.sku_id, po.factory_partner_id
  INTO unit_status, expected_order, expected_spec, expected_sku, expected_factory
  FROM production.production_units u
  JOIN production.production_orders po ON po.id = u.production_order_id
  JOIN engineering.build_specs bs ON bs.id = po.build_spec_id
  WHERE u.id = NEW.production_unit_id;

  IF unit_status IS DISTINCT FROM 'QC_PASSED' THEN RAISE EXCEPTION 'Vehicle birth requires QC_PASSED production unit'; END IF;

  SELECT production_unit_id, result INTO qc_unit, qc_result
  FROM production.qc_inspections WHERE id = NEW.birth_qc_inspection_id;
  IF qc_unit IS DISTINCT FROM NEW.production_unit_id OR qc_result IS DISTINCT FROM 'PASS' THEN
    RAISE EXCEPTION 'Vehicle birth requires a PASS QC inspection for the same production unit';
  END IF;

  SELECT id INTO latest_qc FROM production.qc_inspections
  WHERE production_unit_id = NEW.production_unit_id
  ORDER BY inspected_at DESC, id DESC LIMIT 1;
  IF latest_qc IS DISTINCT FROM NEW.birth_qc_inspection_id THEN
    RAISE EXCEPTION 'Vehicle birth must reference the latest QC inspection';
  END IF;

  IF NEW.production_order_id IS DISTINCT FROM expected_order OR
     NEW.build_spec_id IS DISTINCT FROM expected_spec OR
     NEW.sku_id IS DISTINCT FROM expected_sku OR
     NEW.factory_partner_id IS DISTINCT FROM expected_factory THEN
    RAISE EXCEPTION 'Vehicle birth provenance does not match production truth';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_birth_guard
BEFORE INSERT ON vehicle.vehicles
FOR EACH ROW EXECUTE FUNCTION vehicle.validate_birth();

CREATE OR REPLACE FUNCTION vehicle.protect_birth_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.frame_number IS DISTINCT FROM OLD.frame_number OR
     NEW.production_unit_id IS DISTINCT FROM OLD.production_unit_id OR
     NEW.production_order_id IS DISTINCT FROM OLD.production_order_id OR
     NEW.build_spec_id IS DISTINCT FROM OLD.build_spec_id OR
     NEW.sku_id IS DISTINCT FROM OLD.sku_id OR
     NEW.factory_partner_id IS DISTINCT FROM OLD.factory_partner_id OR
     NEW.birth_qc_inspection_id IS DISTINCT FROM OLD.birth_qc_inspection_id OR
     NEW.born_at IS DISTINCT FROM OLD.born_at THEN
    RAISE EXCEPTION 'Vehicle birth identity and provenance are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_birth_identity_guard
BEFORE UPDATE ON vehicle.vehicles
FOR EACH ROW EXECUTE FUNCTION vehicle.protect_birth_identity();
