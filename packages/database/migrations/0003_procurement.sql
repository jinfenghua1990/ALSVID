CREATE SCHEMA IF NOT EXISTS procurement;

INSERT INTO identity.permissions(id, description) VALUES
  ('procurement.read', 'View supplier quotations and purchase orders'),
  ('procurement.write', 'Create and edit draft procurement documents'),
  ('procurement.issue', 'Issue purchase orders to suppliers'),
  ('procurement.confirm', 'Record supplier confirmations'),
  ('procurement.receive', 'Record physical receipts and factory commitments')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('procurement_manager', 'Procurement manager', 'Manage sourcing, supplier purchase orders and receipts'),
  ('procurement_viewer', 'Procurement viewer', 'Read-only procurement access')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('procurement_manager', 'procurement.read'),
  ('procurement_manager', 'procurement.write'),
  ('procurement_manager', 'procurement.issue'),
  ('procurement_manager', 'procurement.confirm'),
  ('procurement_manager', 'procurement.receive'),
  ('procurement_viewer', 'procurement.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions
WHERE id LIKE 'procurement.%'
ON CONFLICT DO NOTHING;

CREATE SEQUENCE procurement.quotation_number_seq START 1;
CREATE SEQUENCE procurement.po_number_seq START 1;

CREATE TABLE procurement.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL UNIQUE DEFAULT ('SQ-' || lpad(nextval('procurement.quotation_number_seq')::text, 8, '0')),
  supplier_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
  supplier_reference text,
  currency char(3) NOT NULL,
  valid_until date,
  incoterm text,
  payment_terms text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','RECEIVED','ACCEPTED','REJECTED','EXPIRED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (currency = upper(currency) AND length(trim(currency)) = 3)
);
CREATE INDEX procurement_quotations_supplier_idx ON procurement.quotations(supplier_partner_id, created_at DESC);

CREATE TABLE procurement.quotation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES procurement.quotations(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  item_type text NOT NULL CHECK (item_type IN ('PART','SKU')),
  part_id uuid REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  supplier_item_reference text,
  description text NOT NULL DEFAULT '',
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'EA',
  unit_price numeric(20,6) NOT NULL CHECK (unit_price >= 0),
  requested_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quotation_id, line_no),
  CHECK ((item_type = 'PART' AND part_id IS NOT NULL AND sku_id IS NULL) OR (item_type = 'SKU' AND sku_id IS NOT NULL AND part_id IS NULL))
);

CREATE TABLE procurement.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE DEFAULT ('PO-' || lpad(nextval('procurement.po_number_seq')::text, 8, '0')),
  supplier_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
  source_quotation_id uuid REFERENCES procurement.quotations(id) ON DELETE RESTRICT,
  supplier_reference text,
  currency char(3) NOT NULL,
  incoterm text,
  payment_terms text NOT NULL DEFAULT '',
  deposit_terms text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','CONFIRMED','PARTIALLY_FULFILLED','FULFILLED','CANCELLED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  issued_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (currency = upper(currency) AND length(trim(currency)) = 3)
);
CREATE INDEX procurement_purchase_orders_supplier_idx ON procurement.purchase_orders(supplier_partner_id, created_at DESC);
CREATE INDEX procurement_purchase_orders_status_idx ON procurement.purchase_orders(status, created_at DESC);

CREATE TABLE procurement.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  item_type text NOT NULL CHECK (item_type IN ('PART','SKU')),
  part_id uuid REFERENCES engineering.parts(id) ON DELETE RESTRICT,
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  supplier_item_reference text,
  description text NOT NULL DEFAULT '',
  ordered_quantity numeric(18,6) NOT NULL CHECK (ordered_quantity > 0),
  unit text NOT NULL DEFAULT 'EA',
  unit_price numeric(20,6) NOT NULL CHECK (unit_price >= 0),
  requested_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_order_id, line_no),
  CHECK ((item_type = 'PART' AND part_id IS NOT NULL AND sku_id IS NULL) OR (item_type = 'SKU' AND sku_id IS NOT NULL AND part_id IS NULL))
);

CREATE TABLE procurement.supplier_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
  supplier_reference text,
  note text NOT NULL DEFAULT '',
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL
);

CREATE TABLE procurement.supplier_confirmation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_id uuid NOT NULL REFERENCES procurement.supplier_confirmations(id) ON DELETE CASCADE,
  purchase_order_line_id uuid NOT NULL REFERENCES procurement.purchase_order_lines(id) ON DELETE RESTRICT,
  confirmed_quantity numeric(18,6) NOT NULL CHECK (confirmed_quantity > 0),
  confirmed_date date,
  note text NOT NULL DEFAULT '',
  UNIQUE (confirmation_id, purchase_order_line_id)
);

CREATE TABLE procurement.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('PHYSICAL_RECEIPT','FACTORY_COMMITMENT')),
  reference text,
  occurred_on date NOT NULL,
  note text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE procurement.receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES procurement.receipts(id) ON DELETE CASCADE,
  purchase_order_line_id uuid NOT NULL REFERENCES procurement.purchase_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'EA',
  note text NOT NULL DEFAULT '',
  UNIQUE (receipt_id, purchase_order_line_id)
);

CREATE TABLE procurement.purchase_order_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
  state text NOT NULL,
  po_version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX procurement_po_snapshots_idx ON procurement.purchase_order_snapshots(purchase_order_id, created_at);

CREATE OR REPLACE FUNCTION procurement.reject_snapshot_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'purchase_order_snapshots is append-only';
END;
$$;
CREATE TRIGGER procurement_snapshots_no_mutation
BEFORE UPDATE OR DELETE ON procurement.purchase_order_snapshots
FOR EACH ROW EXECUTE FUNCTION procurement.reject_snapshot_mutation();

CREATE OR REPLACE FUNCTION procurement.require_supplier_partner() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM partners.roles r
    WHERE r.partner_id = NEW.supplier_partner_id
      AND r.enabled = true
      AND r.role IN ('SUPPLIER','FACTORY')
  ) THEN
    RAISE EXCEPTION 'Procurement supplier must have SUPPLIER or FACTORY Partner role';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER procurement_quotation_supplier_role
BEFORE INSERT OR UPDATE OF supplier_partner_id ON procurement.quotations
FOR EACH ROW EXECUTE FUNCTION procurement.require_supplier_partner();
CREATE TRIGGER procurement_po_supplier_role
BEFORE INSERT OR UPDATE OF supplier_partner_id ON procurement.purchase_orders
FOR EACH ROW EXECUTE FUNCTION procurement.require_supplier_partner();

CREATE OR REPLACE FUNCTION procurement.require_draft_quotation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_status text;
BEGIN
  SELECT status INTO parent_status FROM procurement.quotations WHERE id = COALESCE(NEW.quotation_id, OLD.quotation_id);
  IF parent_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Only draft quotations can be edited'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER procurement_quotation_lines_draft_only
BEFORE INSERT OR UPDATE OR DELETE ON procurement.quotation_lines
FOR EACH ROW EXECUTE FUNCTION procurement.require_draft_quotation();

CREATE OR REPLACE FUNCTION procurement.validate_po_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status = 'DRAFT' AND NEW.status IN ('ISSUED','CANCELLED')) OR
    (OLD.status = 'ISSUED' AND NEW.status IN ('CONFIRMED','CANCELLED')) OR
    (OLD.status = 'CONFIRMED' AND NEW.status IN ('PARTIALLY_FULFILLED','FULFILLED','CANCELLED')) OR
    (OLD.status = 'PARTIALLY_FULFILLED' AND NEW.status IN ('FULFILLED','CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Invalid purchase order transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER procurement_po_transition_guard
BEFORE UPDATE OF status ON procurement.purchase_orders
FOR EACH ROW EXECUTE FUNCTION procurement.validate_po_transition();

CREATE OR REPLACE FUNCTION procurement.protect_issued_po_terms() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND (
    NEW.supplier_partner_id IS DISTINCT FROM OLD.supplier_partner_id OR
    NEW.source_quotation_id IS DISTINCT FROM OLD.source_quotation_id OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.incoterm IS DISTINCT FROM OLD.incoterm OR
    NEW.payment_terms IS DISTINCT FROM OLD.payment_terms OR
    NEW.deposit_terms IS DISTINCT FROM OLD.deposit_terms
  ) THEN
    RAISE EXCEPTION 'Issued purchase order commercial terms are immutable; create an amendment workflow instead';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER procurement_po_terms_immutable_after_issue
BEFORE UPDATE ON procurement.purchase_orders
FOR EACH ROW EXECUTE FUNCTION procurement.protect_issued_po_terms();

CREATE OR REPLACE FUNCTION procurement.require_draft_po_line() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_status text;
BEGIN
  SELECT status INTO parent_status FROM procurement.purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  IF parent_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Issued purchase order lines are immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER procurement_po_lines_draft_only
BEFORE INSERT OR UPDATE OR DELETE ON procurement.purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION procurement.require_draft_po_line();

CREATE OR REPLACE FUNCTION procurement.capture_po_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE lines_json jsonb;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.line_no), '[]'::jsonb)
  INTO lines_json
  FROM procurement.purchase_order_lines l
  WHERE l.purchase_order_id = NEW.id;

  INSERT INTO procurement.purchase_order_snapshots(purchase_order_id, state, po_version, snapshot)
  VALUES (
    NEW.id,
    NEW.status,
    NEW.version,
    jsonb_build_object(
      'header', to_jsonb(NEW) - 'created_by' - 'updated_by',
      'lines', lines_json
    )
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER procurement_po_state_snapshot
AFTER UPDATE OF status ON procurement.purchase_orders
FOR EACH ROW EXECUTE FUNCTION procurement.capture_po_snapshot();

CREATE OR REPLACE FUNCTION procurement.validate_confirmation_line_po() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE confirmation_po uuid; line_po uuid;
BEGIN
  SELECT purchase_order_id INTO confirmation_po FROM procurement.supplier_confirmations WHERE id = NEW.confirmation_id;
  SELECT purchase_order_id INTO line_po FROM procurement.purchase_order_lines WHERE id = NEW.purchase_order_line_id;
  IF confirmation_po IS DISTINCT FROM line_po THEN RAISE EXCEPTION 'Confirmation line must belong to the same purchase order'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER procurement_confirmation_line_po_guard
BEFORE INSERT OR UPDATE ON procurement.supplier_confirmation_lines
FOR EACH ROW EXECUTE FUNCTION procurement.validate_confirmation_line_po();

CREATE OR REPLACE FUNCTION procurement.validate_receipt_line_po() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE receipt_po uuid; line_po uuid;
BEGIN
  SELECT purchase_order_id INTO receipt_po FROM procurement.receipts WHERE id = NEW.receipt_id;
  SELECT purchase_order_id INTO line_po FROM procurement.purchase_order_lines WHERE id = NEW.purchase_order_line_id;
  IF receipt_po IS DISTINCT FROM line_po THEN RAISE EXCEPTION 'Receipt line must belong to the same purchase order'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER procurement_receipt_line_po_guard
BEFORE INSERT OR UPDATE ON procurement.receipt_lines
FOR EACH ROW EXECUTE FUNCTION procurement.validate_receipt_line_po();
