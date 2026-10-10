CREATE SCHEMA IF NOT EXISTS logistics;

INSERT INTO identity.permissions(id, description) VALUES
  ('logistics.read', 'View export shipments, cargo, milestones and customs facts'),
  ('logistics.plan', 'Create and plan export shipments and cargo allocations'),
  ('logistics.release', 'Release, dispatch, cancel and receive export shipments'),
  ('logistics.milestone', 'Append shipment operational milestones and exceptions'),
  ('logistics.customs', 'Manage customs declarations, classifications and customs events')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('logistics_manager', 'Logistics manager', 'Plan, release and operate export shipments'),
  ('logistics_operator', 'Logistics operator', 'Operate shipment milestones and cargo execution'),
  ('customs_specialist', 'Customs specialist', 'Manage export/import customs evidence'),
  ('logistics_viewer', 'Logistics viewer', 'Read-only export-logistics visibility')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('logistics_manager', 'logistics.read'),
  ('logistics_manager', 'logistics.plan'),
  ('logistics_manager', 'logistics.release'),
  ('logistics_manager', 'logistics.milestone'),
  ('logistics_manager', 'logistics.customs'),
  ('logistics_operator', 'logistics.read'),
  ('logistics_operator', 'logistics.plan'),
  ('logistics_operator', 'logistics.milestone'),
  ('customs_specialist', 'logistics.read'),
  ('customs_specialist', 'logistics.customs'),
  ('logistics_viewer', 'logistics.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions
WHERE id IN ('logistics.read','logistics.plan','logistics.release','logistics.milestone','logistics.customs')
ON CONFLICT DO NOTHING;

CREATE SEQUENCE logistics.shipment_number_seq START 1;
CREATE SEQUENCE logistics.customs_declaration_number_seq START 1;

CREATE TABLE logistics.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number text NOT NULL UNIQUE DEFAULT ('SHP-' || lpad(nextval('logistics.shipment_number_seq')::text, 9, '0')),
  route_type text NOT NULL CHECK (route_type IN ('FACTORY_TO_GERMANY_WAREHOUSE','FACTORY_TO_DEALER_DIRECT')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RELEASED','DISPATCHED','IN_TRANSIT','ARRIVED','DELIVERED','CANCELLED')),
  origin_location_id uuid NOT NULL REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  destination_location_id uuid REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  destination_dealer_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  destination_address_id uuid REFERENCES partners.addresses(id) ON DELETE RESTRICT,
  carrier_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  transport_mode text NOT NULL DEFAULT 'SEA' CHECK (transport_mode IN ('ROAD','RAIL','SEA','AIR','MULTIMODAL')),
  incoterm text CHECK (incoterm IS NULL OR incoterm IN ('EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF')),
  booking_reference text,
  bill_of_lading text,
  container_reference text,
  tracking_reference text,
  planned_etd timestamptz,
  planned_eta timestamptz,
  released_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  inventory_received_at timestamptz,
  note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (planned_eta IS NULL OR planned_etd IS NULL OR planned_eta >= planned_etd),
  CHECK (
    (route_type='FACTORY_TO_GERMANY_WAREHOUSE' AND destination_location_id IS NOT NULL AND destination_dealer_partner_id IS NULL AND destination_address_id IS NULL) OR
    (route_type='FACTORY_TO_DEALER_DIRECT' AND destination_location_id IS NULL AND destination_dealer_partner_id IS NOT NULL AND destination_address_id IS NOT NULL)
  ),
  CHECK (destination_location_id IS NULL OR destination_location_id <> origin_location_id)
);
CREATE INDEX logistics_shipments_status_idx ON logistics.shipments(status, created_at DESC);
CREATE INDEX logistics_shipments_route_idx ON logistics.shipments(route_type, created_at DESC);

CREATE TABLE logistics.shipment_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  item_kind text NOT NULL CHECK (item_kind IN ('SKU','VEHICLE')),
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  vehicle_id uuid REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'EA' CHECK (upper(unit)='EA'),
  reservation_id uuid NOT NULL UNIQUE REFERENCES inventory.reservations(id) ON DELETE RESTRICT,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (item_kind='SKU' AND sku_id IS NOT NULL AND vehicle_id IS NULL) OR
    (item_kind='VEHICLE' AND sku_id IS NULL AND vehicle_id IS NOT NULL AND quantity=1)
  )
);
CREATE UNIQUE INDEX logistics_shipment_cargo_sku_uq ON logistics.shipment_cargo(shipment_id, sku_id) WHERE item_kind='SKU';
CREATE UNIQUE INDEX logistics_shipment_cargo_vehicle_uq ON logistics.shipment_cargo(shipment_id, vehicle_id) WHERE item_kind='VEHICLE';
CREATE INDEX logistics_shipment_cargo_shipment_idx ON logistics.shipment_cargo(shipment_id, created_at);

CREATE TABLE logistics.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'PLANNED','BOOKED','CARGO_READY','PICKED_UP','CHINA_EXPORT_DECLARED','CHINA_EXPORT_CLEARED',
    'DEPARTED','IN_TRANSIT','ARRIVED_EU','IMPORT_DECLARED','IMPORT_CLEARED',
    'DELIVERED_GERMANY_WAREHOUSE','DELIVERED_DEALER','EXCEPTION','HOLD','RELEASED_FROM_HOLD','CANCELLED'
  )),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  location_text text,
  note text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX logistics_shipment_events_timeline_idx ON logistics.shipment_events(shipment_id, occurred_at, created_at, id);

CREATE TABLE logistics.customs_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_code text NOT NULL UNIQUE DEFAULT ('CUS-' || lpad(nextval('logistics.customs_declaration_number_seq')::text, 9, '0')),
  shipment_id uuid NOT NULL REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK (direction IN ('EXPORT','IMPORT')),
  jurisdiction text NOT NULL CHECK (length(trim(jurisdiction)) > 0),
  declaration_number text,
  exporter_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  importer_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  importer_of_record_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  exporter_eori_identifier_id uuid REFERENCES partners.identifiers(id) ON DELETE RESTRICT,
  importer_eori_identifier_id uuid REFERENCES partners.identifiers(id) ON DELETE RESTRICT,
  importer_of_record_eori_identifier_id uuid REFERENCES partners.identifiers(id) ON DELETE RESTRICT,
  commercial_invoice_number text,
  packing_list_number text,
  commercial_invoice_asset_id uuid REFERENCES assets.objects(id) ON DELETE RESTRICT,
  packing_list_asset_id uuid REFERENCES assets.objects(id) ON DELETE RESTRICT,
  customs_document_asset_id uuid REFERENCES assets.objects(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL DEFAULT 'EUR',
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (currency=upper(currency))
);
CREATE UNIQUE INDEX logistics_customs_declaration_number_uq ON logistics.customs_declarations(jurisdiction, declaration_number) WHERE declaration_number IS NOT NULL;
CREATE INDEX logistics_customs_shipment_idx ON logistics.customs_declarations(shipment_id, direction, created_at DESC);

CREATE TABLE logistics.customs_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id uuid NOT NULL REFERENCES logistics.customs_declarations(id) ON DELETE RESTRICT,
  cargo_id uuid NOT NULL REFERENCES logistics.shipment_cargo(id) ON DELETE RESTRICT,
  origin_country char(2) NOT NULL,
  hs_code text NOT NULL CHECK (length(trim(hs_code)) >= 4),
  cn_code text,
  taric_code text,
  declared_value numeric(18,6) NOT NULL DEFAULT 0 CHECK (declared_value >= 0),
  duty_rate numeric(9,6) CHECK (duty_rate IS NULL OR duty_rate >= 0),
  duty_amount numeric(18,6) CHECK (duty_amount IS NULL OR duty_amount >= 0),
  import_vat_rate numeric(9,6) CHECK (import_vat_rate IS NULL OR import_vat_rate >= 0),
  import_vat_amount numeric(18,6) CHECK (import_vat_amount IS NULL OR import_vat_amount >= 0),
  anti_dumping_rate numeric(9,6) CHECK (anti_dumping_rate IS NULL OR anti_dumping_rate >= 0),
  anti_dumping_amount numeric(18,6) CHECK (anti_dumping_amount IS NULL OR anti_dumping_amount >= 0),
  countervailing_rate numeric(9,6) CHECK (countervailing_rate IS NULL OR countervailing_rate >= 0),
  countervailing_amount numeric(18,6) CHECK (countervailing_amount IS NULL OR countervailing_amount >= 0),
  operational_fees_amount numeric(18,6) CHECK (operational_fees_amount IS NULL OR operational_fees_amount >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (declaration_id, cargo_id),
  CHECK (origin_country=upper(origin_country))
);
CREATE INDEX logistics_customs_lines_declaration_idx ON logistics.customs_lines(declaration_id, created_at);

CREATE TABLE logistics.customs_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id uuid NOT NULL REFERENCES logistics.customs_declarations(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('DRAFT','DECLARED','HELD','RELEASED_FROM_HOLD','CLEARED','CORRECTED','CANCELLED')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reference text,
  note text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX logistics_customs_events_timeline_idx ON logistics.customs_events(declaration_id, occurred_at, created_at, id);

CREATE TABLE logistics.receiving_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  cargo_id uuid NOT NULL UNIQUE REFERENCES logistics.shipment_cargo(id) ON DELETE RESTRICT,
  inventory_movement_id uuid NOT NULL UNIQUE REFERENCES inventory.movements(id) ON DELETE RESTRICT,
  destination_location_id uuid NOT NULL REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  received_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX logistics_receiving_handoffs_shipment_idx ON logistics.receiving_handoffs(shipment_id, received_at);

CREATE OR REPLACE FUNCTION logistics.require_partner_role(p_partner_id uuid, p_role text, p_message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_partner_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM partners.roles WHERE partner_id=p_partner_id AND role=p_role AND enabled=true) THEN
    RAISE EXCEPTION '%',p_message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION logistics.validate_shipment_route() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE address_partner uuid;
BEGIN
  IF NEW.carrier_partner_id IS NOT NULL THEN
    PERFORM logistics.require_partner_role(NEW.carrier_partner_id,'LOGISTICS_PROVIDER','Shipment carrier must have LOGISTICS_PROVIDER Partner role');
  END IF;
  IF NEW.route_type='FACTORY_TO_DEALER_DIRECT' THEN
    PERFORM logistics.require_partner_role(NEW.destination_dealer_partner_id,'DEALER','Dealer-direct destination must have DEALER Partner role');
    SELECT partner_id INTO address_partner FROM partners.addresses WHERE id=NEW.destination_address_id;
    IF address_partner IS DISTINCT FROM NEW.destination_dealer_partner_id THEN
      RAISE EXCEPTION 'Dealer-direct destination address must belong to the selected Dealer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_shipment_route_guard
BEFORE INSERT OR UPDATE OF route_type,destination_location_id,destination_dealer_partner_id,destination_address_id,carrier_partner_id ON logistics.shipments
FOR EACH ROW EXECUTE FUNCTION logistics.validate_shipment_route();

CREATE OR REPLACE FUNCTION logistics.validate_shipment_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status='DRAFT' AND NEW.status IN ('RELEASED','CANCELLED')) OR
    (OLD.status='RELEASED' AND NEW.status IN ('DISPATCHED','CANCELLED')) OR
    (OLD.status='DISPATCHED' AND NEW.status IN ('IN_TRANSIT','ARRIVED','DELIVERED')) OR
    (OLD.status='IN_TRANSIT' AND NEW.status IN ('ARRIVED','DELIVERED')) OR
    (OLD.status='ARRIVED' AND NEW.status='DELIVERED')
  ) THEN
    RAISE EXCEPTION 'Invalid shipment transition: % -> %',OLD.status,NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_shipment_transition_guard
BEFORE UPDATE OF status ON logistics.shipments
FOR EACH ROW EXECUTE FUNCTION logistics.validate_shipment_transition();

CREATE OR REPLACE FUNCTION logistics.protect_shipment_baseline() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
    NEW.route_type IS DISTINCT FROM OLD.route_type OR
    NEW.origin_location_id IS DISTINCT FROM OLD.origin_location_id OR
    NEW.destination_location_id IS DISTINCT FROM OLD.destination_location_id OR
    NEW.destination_dealer_partner_id IS DISTINCT FROM OLD.destination_dealer_partner_id OR
    NEW.destination_address_id IS DISTINCT FROM OLD.destination_address_id
  ) THEN RAISE EXCEPTION 'Released shipment route baseline is immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_shipment_baseline_guard
BEFORE UPDATE ON logistics.shipments
FOR EACH ROW EXECUTE FUNCTION logistics.protect_shipment_baseline();

CREATE OR REPLACE FUNCTION logistics.validate_cargo() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  shipment_status text;
  shipment_origin uuid;
  reservation_row inventory.reservations%ROWTYPE;
BEGIN
  SELECT status,origin_location_id INTO shipment_status,shipment_origin FROM logistics.shipments WHERE id=NEW.shipment_id;
  IF shipment_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Shipment cargo can be added only while shipment is DRAFT'; END IF;
  SELECT * INTO reservation_row FROM inventory.reservations WHERE id=NEW.reservation_id;
  IF reservation_row.id IS NULL OR reservation_row.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Shipment cargo requires an active Inventory reservation'; END IF;
  IF reservation_row.location_id IS DISTINCT FROM shipment_origin THEN RAISE EXCEPTION 'Shipment cargo reservation must use the shipment origin location'; END IF;
  IF reservation_row.reference_type IS DISTINCT FROM 'SHIPMENT' OR reservation_row.reference_id IS DISTINCT FROM NEW.shipment_id THEN
    RAISE EXCEPTION 'Shipment cargo reservation must reference this shipment';
  END IF;
  IF reservation_row.item_kind IS DISTINCT FROM NEW.item_kind OR
     reservation_row.sku_id IS DISTINCT FROM NEW.sku_id OR
     reservation_row.vehicle_id IS DISTINCT FROM NEW.vehicle_id OR
     reservation_row.quantity IS DISTINCT FROM NEW.quantity OR upper(reservation_row.unit) <> upper(NEW.unit) THEN
    RAISE EXCEPTION 'Shipment cargo does not match its Inventory reservation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_cargo_insert_guard
BEFORE INSERT ON logistics.shipment_cargo
FOR EACH ROW EXECUTE FUNCTION logistics.validate_cargo();

CREATE OR REPLACE FUNCTION logistics.protect_cargo_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE shipment_id_value uuid; shipment_status text;
BEGIN
  shipment_id_value := CASE WHEN TG_OP='DELETE' THEN OLD.shipment_id ELSE NEW.shipment_id END;
  SELECT status INTO shipment_status FROM logistics.shipments WHERE id=shipment_id_value;
  IF shipment_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Released shipment cargo is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER logistics_cargo_mutation_guard
BEFORE UPDATE OR DELETE ON logistics.shipment_cargo
FOR EACH ROW EXECUTE FUNCTION logistics.protect_cargo_mutation();

CREATE OR REPLACE FUNCTION logistics.validate_shipment_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE route text;
BEGIN
  SELECT route_type INTO route FROM logistics.shipments WHERE id=NEW.shipment_id;
  IF NEW.event_type='DELIVERED_GERMANY_WAREHOUSE' AND route <> 'FACTORY_TO_GERMANY_WAREHOUSE' THEN
    RAISE EXCEPTION 'Germany warehouse delivery milestone is invalid for this route';
  END IF;
  IF NEW.event_type='DELIVERED_DEALER' AND route <> 'FACTORY_TO_DEALER_DIRECT' THEN
    RAISE EXCEPTION 'Dealer delivery milestone is invalid for this route';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_shipment_event_route_guard
BEFORE INSERT ON logistics.shipment_events
FOR EACH ROW EXECUTE FUNCTION logistics.validate_shipment_event();

CREATE OR REPLACE FUNCTION logistics.reject_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Logistics evidence is append-only';
END;
$$;
CREATE TRIGGER logistics_shipment_events_no_mutation BEFORE UPDATE OR DELETE ON logistics.shipment_events FOR EACH ROW EXECUTE FUNCTION logistics.reject_evidence_mutation();
CREATE TRIGGER logistics_customs_events_no_mutation BEFORE UPDATE OR DELETE ON logistics.customs_events FOR EACH ROW EXECUTE FUNCTION logistics.reject_evidence_mutation();
CREATE TRIGGER logistics_receiving_handoffs_no_mutation BEFORE UPDATE OR DELETE ON logistics.receiving_handoffs FOR EACH ROW EXECUTE FUNCTION logistics.reject_evidence_mutation();

CREATE OR REPLACE FUNCTION logistics.seed_planned_event() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO logistics.shipment_events(shipment_id,event_type,occurred_at,note,created_by)
  VALUES (NEW.id,'PLANNED',NEW.created_at,'Shipment plan created',NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_shipment_seed_event AFTER INSERT ON logistics.shipments FOR EACH ROW EXECUTE FUNCTION logistics.seed_planned_event();

CREATE OR REPLACE FUNCTION logistics.validate_eori_identifier(p_identifier_id uuid,p_partner_id uuid,p_label text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE identifier_partner uuid; identifier_scheme text;
BEGIN
  IF p_identifier_id IS NULL THEN RETURN; END IF;
  SELECT partner_id,upper(scheme) INTO identifier_partner,identifier_scheme FROM partners.identifiers WHERE id=p_identifier_id;
  IF identifier_partner IS DISTINCT FROM p_partner_id OR identifier_scheme IS DISTINCT FROM 'EORI' THEN
    RAISE EXCEPTION '% EORI identifier must belong to the selected Partner',p_label;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION logistics.validate_customs_parties() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM logistics.validate_eori_identifier(NEW.exporter_eori_identifier_id,NEW.exporter_partner_id,'Exporter');
  PERFORM logistics.validate_eori_identifier(NEW.importer_eori_identifier_id,NEW.importer_partner_id,'Importer');
  PERFORM logistics.validate_eori_identifier(NEW.importer_of_record_eori_identifier_id,NEW.importer_of_record_partner_id,'Importer-of-record');
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_customs_party_guard
BEFORE INSERT OR UPDATE OF exporter_partner_id,importer_partner_id,importer_of_record_partner_id,exporter_eori_identifier_id,importer_eori_identifier_id,importer_of_record_eori_identifier_id ON logistics.customs_declarations
FOR EACH ROW EXECUTE FUNCTION logistics.validate_customs_parties();

CREATE OR REPLACE FUNCTION logistics.seed_customs_draft() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO logistics.customs_events(declaration_id,event_type,occurred_at,note,created_by)
  VALUES (NEW.id,'DRAFT',NEW.created_at,'Customs declaration created',NEW.created_by);
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_customs_seed_event AFTER INSERT ON logistics.customs_declarations FOR EACH ROW EXECUTE FUNCTION logistics.seed_customs_draft();

CREATE OR REPLACE FUNCTION logistics.validate_customs_line() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE declaration_shipment uuid; cargo_shipment uuid; latest_status text;
BEGIN
  SELECT shipment_id INTO declaration_shipment FROM logistics.customs_declarations WHERE id=NEW.declaration_id;
  SELECT shipment_id INTO cargo_shipment FROM logistics.shipment_cargo WHERE id=NEW.cargo_id;
  IF declaration_shipment IS DISTINCT FROM cargo_shipment THEN RAISE EXCEPTION 'Customs line cargo must belong to the declaration shipment'; END IF;
  SELECT event_type INTO latest_status FROM logistics.customs_events WHERE declaration_id=NEW.declaration_id ORDER BY occurred_at DESC,created_at DESC,id DESC LIMIT 1;
  IF latest_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Customs lines are editable only while declaration is DRAFT'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_customs_line_insert_guard BEFORE INSERT ON logistics.customs_lines FOR EACH ROW EXECUTE FUNCTION logistics.validate_customs_line();
CREATE TRIGGER logistics_customs_line_update_guard BEFORE UPDATE ON logistics.customs_lines FOR EACH ROW EXECUTE FUNCTION logistics.validate_customs_line();

CREATE OR REPLACE FUNCTION logistics.protect_customs_line_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE latest_status text;
BEGIN
  SELECT event_type INTO latest_status FROM logistics.customs_events WHERE declaration_id=OLD.declaration_id ORDER BY occurred_at DESC,created_at DESC,id DESC LIMIT 1;
  IF latest_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Customs lines are editable only while declaration is DRAFT'; END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER logistics_customs_line_delete_guard BEFORE DELETE ON logistics.customs_lines FOR EACH ROW EXECUTE FUNCTION logistics.protect_customs_line_delete();

CREATE OR REPLACE FUNCTION logistics.validate_customs_event_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE previous_status text;
BEGIN
  SELECT event_type INTO previous_status FROM logistics.customs_events
  WHERE declaration_id=NEW.declaration_id
  ORDER BY occurred_at DESC,created_at DESC,id DESC LIMIT 1;
  IF previous_status IS NULL THEN
    IF NEW.event_type <> 'DRAFT' THEN RAISE EXCEPTION 'First customs event must be DRAFT'; END IF;
    RETURN NEW;
  END IF;
  IF NOT (
    (previous_status='DRAFT' AND NEW.event_type IN ('DECLARED','CANCELLED')) OR
    (previous_status='DECLARED' AND NEW.event_type IN ('HELD','CLEARED','CORRECTED')) OR
    (previous_status='HELD' AND NEW.event_type IN ('RELEASED_FROM_HOLD','CORRECTED')) OR
    (previous_status='RELEASED_FROM_HOLD' AND NEW.event_type IN ('HELD','CLEARED','CORRECTED')) OR
    (previous_status='CORRECTED' AND NEW.event_type IN ('DECLARED','HELD','CLEARED'))
  ) THEN RAISE EXCEPTION 'Invalid customs event transition: % -> %',previous_status,NEW.event_type; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER logistics_customs_event_transition_guard BEFORE INSERT ON logistics.customs_events FOR EACH ROW EXECUTE FUNCTION logistics.validate_customs_event_transition();
