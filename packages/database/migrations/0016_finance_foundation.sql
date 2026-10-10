CREATE SCHEMA IF NOT EXISTS finance;

INSERT INTO identity.permissions(id, description) VALUES
  ('finance.read', 'View ALSVID finance documents, obligations, payments and settlements'),
  ('finance.document.write', 'Create and edit draft Finance documents'),
  ('finance.document.post', 'Verify and post Finance documents and obligations'),
  ('finance.payment.write', 'Record immutable payment evidence and explicit reversals'),
  ('finance.allocate', 'Allocate payments to obligations and reverse allocations'),
  ('finance.reconcile', 'Resolve Finance reconciliation exceptions and unmatched items'),
  ('finance.landed_cost', 'Build and finalize Shipment landed-cost allocations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('finance_manager', 'Finance manager', 'Manage ALSVID commercial Finance facts and reconciliation'),
  ('finance_operator', 'Finance operator', 'Record documents, payments and allocations'),
  ('finance_viewer', 'Finance viewer', 'Read-only Finance visibility')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('finance_manager','finance.read'),('finance_manager','finance.document.write'),('finance_manager','finance.document.post'),
  ('finance_manager','finance.payment.write'),('finance_manager','finance.allocate'),('finance_manager','finance.reconcile'),('finance_manager','finance.landed_cost'),
  ('finance_operator','finance.read'),('finance_operator','finance.document.write'),('finance_operator','finance.payment.write'),('finance_operator','finance.allocate'),
  ('finance_viewer','finance.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions WHERE id LIKE 'finance.%'
ON CONFLICT DO NOTHING;

CREATE SEQUENCE finance.document_number_seq START 1;
CREATE SEQUENCE finance.obligation_number_seq START 1;
CREATE SEQUENCE finance.payment_number_seq START 1;
CREATE SEQUENCE finance.landed_cost_batch_seq START 1;

CREATE TABLE finance.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE DEFAULT ('FIN-DOC-' || lpad(nextval('finance.document_number_seq')::text, 9, '0')),
  document_type text NOT NULL CHECK (document_type IN ('SUPPLIER_INVOICE','CUSTOMER_INVOICE','SUPPLIER_CREDIT_NOTE','CUSTOMER_CREDIT_NOTE','DEBIT_NOTE','OTHER')),
  partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
  external_reference text,
  currency char(3) NOT NULL CHECK (currency=upper(currency) AND length(trim(currency))=3),
  issue_date date NOT NULL,
  due_date date,
  subtotal_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  tax_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  source_type text NOT NULL DEFAULT 'MANUAL' CHECK (source_type IN ('PROCUREMENT_PO','COMMERCE_ORDER','LOGISTICS_SHIPMENT','MANUAL')),
  source_id uuid,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','VERIFIED','POSTED','VOIDED')),
  note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  verified_at timestamptz,
  verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  posted_at timestamptz,
  posted_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  voided_at timestamptz,
  voided_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  void_reason text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_date IS NULL OR due_date >= issue_date),
  CHECK (total_amount = subtotal_amount + tax_amount),
  CHECK ((source_type='MANUAL' AND source_id IS NULL) OR (source_type<>'MANUAL' AND source_id IS NOT NULL))
);
CREATE UNIQUE INDEX finance_document_partner_external_uq ON finance.documents(partner_id,document_type,external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX finance_documents_partner_idx ON finance.documents(partner_id,issue_date DESC);
CREATE INDEX finance_documents_status_idx ON finance.documents(status,issue_date DESC);

CREATE TABLE finance.document_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES finance.documents(id) ON DELETE CASCADE,
  line_no integer NOT NULL CHECK (line_no > 0),
  category text NOT NULL CHECK (category IN ('GOODS','FREIGHT','INSURANCE','DUTY','IMPORT_VAT','ANTI_DUMPING','COUNTERVAILING','OPERATIONAL_FEE','SERVICE','OTHER')),
  description text NOT NULL DEFAULT '',
  quantity numeric(18,6) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'EA',
  unit_price numeric(20,6) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  net_amount numeric(20,6) NOT NULL CHECK (net_amount >= 0),
  tax_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  shipment_id uuid REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id,line_no)
);
CREATE INDEX finance_document_lines_document_idx ON finance.document_lines(document_id,line_no);

CREATE TABLE finance.obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_number text NOT NULL UNIQUE DEFAULT ('OBL-' || lpad(nextval('finance.obligation_number_seq')::text, 9, '0')),
  direction text NOT NULL CHECK (direction IN ('AR','AP')),
  partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
  document_id uuid UNIQUE REFERENCES finance.documents(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL CHECK (currency=upper(currency)),
  original_amount numeric(20,6) NOT NULL CHECK (original_amount > 0),
  due_date date,
  source_type text NOT NULL DEFAULT 'MANUAL' CHECK (source_type IN ('PROCUREMENT_PO','COMMERCE_ORDER','LOGISTICS_SHIPMENT','MANUAL')),
  source_id uuid,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_type='MANUAL' AND source_id IS NULL) OR (source_type<>'MANUAL' AND source_id IS NOT NULL))
);
CREATE INDEX finance_obligations_partner_idx ON finance.obligations(partner_id,direction,due_date);

CREATE TABLE finance.obligation_voids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL UNIQUE REFERENCES finance.obligations(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  voided_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  voided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text NOT NULL UNIQUE DEFAULT ('PAY-' || lpad(nextval('finance.payment_number_seq')::text, 9, '0')),
  direction text NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL CHECK (currency=upper(currency)),
  amount numeric(20,6) NOT NULL CHECK (amount > 0),
  value_date date NOT NULL,
  provider text NOT NULL DEFAULT 'MANUAL',
  account_reference text,
  external_reference text,
  idempotency_key text NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) > 0),
  note text NOT NULL DEFAULT '',
  posted_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_payments_partner_idx ON finance.payments(partner_id,value_date DESC);
CREATE INDEX finance_payments_external_idx ON finance.payments(provider,external_reference) WHERE external_reference IS NOT NULL;

CREATE TABLE finance.payment_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES finance.payments(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  reversed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  reversed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency char(3) NOT NULL CHECK (base_currency=upper(base_currency)),
  quote_currency char(3) NOT NULL CHECK (quote_currency=upper(quote_currency)),
  rate numeric(24,12) NOT NULL CHECK (rate > 0),
  effective_at timestamptz NOT NULL,
  source text NOT NULL CHECK (length(trim(source)) > 0),
  external_reference text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (base_currency <> quote_currency),
  UNIQUE (base_currency,quote_currency,effective_at,source)
);
CREATE INDEX finance_fx_rates_lookup_idx ON finance.fx_rates(base_currency,quote_currency,effective_at DESC);

CREATE TABLE finance.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES finance.payments(id) ON DELETE RESTRICT,
  obligation_id uuid NOT NULL REFERENCES finance.obligations(id) ON DELETE RESTRICT,
  payment_amount numeric(20,6) NOT NULL CHECK (payment_amount > 0),
  obligation_amount numeric(20,6) NOT NULL CHECK (obligation_amount > 0),
  fx_rate_id uuid REFERENCES finance.fx_rates(id) ON DELETE RESTRICT,
  note text NOT NULL DEFAULT '',
  allocated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  allocated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_allocations_payment_idx ON finance.allocations(payment_id,allocated_at,id);
CREATE INDEX finance_allocations_obligation_idx ON finance.allocations(obligation_id,allocated_at,id);

CREATE TABLE finance.allocation_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL UNIQUE REFERENCES finance.allocations(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  reversed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  reversed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW finance.v_obligations AS
SELECT o.*,
  COALESCE(SUM(a.obligation_amount) FILTER (WHERE ar.id IS NULL),0)::numeric(20,6) AS allocated_amount,
  (o.original_amount-COALESCE(SUM(a.obligation_amount) FILTER (WHERE ar.id IS NULL),0))::numeric(20,6) AS outstanding_amount,
  CASE
    WHEN ov.id IS NOT NULL THEN 'VOID'
    WHEN COALESCE(SUM(a.obligation_amount) FILTER (WHERE ar.id IS NULL),0)=0 THEN 'OPEN'
    WHEN COALESCE(SUM(a.obligation_amount) FILTER (WHERE ar.id IS NULL),0)>=o.original_amount THEN 'SETTLED'
    ELSE 'PARTIALLY_SETTLED'
  END AS settlement_status,
  CASE WHEN ov.id IS NULL AND o.due_date IS NOT NULL AND o.due_date<current_date AND o.original_amount-COALESCE(SUM(a.obligation_amount) FILTER (WHERE ar.id IS NULL),0)>0 THEN current_date-o.due_date ELSE 0 END AS days_overdue
FROM finance.obligations o
LEFT JOIN finance.obligation_voids ov ON ov.obligation_id=o.id
LEFT JOIN finance.allocations a ON a.obligation_id=o.id
LEFT JOIN finance.allocation_reversals ar ON ar.allocation_id=a.id
GROUP BY o.id,ov.id;

CREATE OR REPLACE VIEW finance.v_payments AS
SELECT p.*,
  COALESCE(SUM(a.payment_amount) FILTER (WHERE ar.id IS NULL),0)::numeric(20,6) AS allocated_amount,
  (p.amount-COALESCE(SUM(a.payment_amount) FILTER (WHERE ar.id IS NULL),0))::numeric(20,6) AS unallocated_amount,
  CASE
    WHEN pr.id IS NOT NULL THEN 'REVERSED'
    WHEN COALESCE(SUM(a.payment_amount) FILTER (WHERE ar.id IS NULL),0)=0 THEN 'UNALLOCATED'
    WHEN COALESCE(SUM(a.payment_amount) FILTER (WHERE ar.id IS NULL),0)>=p.amount THEN 'ALLOCATED'
    ELSE 'PARTIAL'
  END AS allocation_status
FROM finance.payments p
LEFT JOIN finance.payment_reversals pr ON pr.payment_id=p.id
LEFT JOIN finance.allocations a ON a.payment_id=p.id
LEFT JOIN finance.allocation_reversals ar ON ar.allocation_id=a.id
GROUP BY p.id,pr.id;

CREATE OR REPLACE VIEW finance.v_partner_balances AS
SELECT partner_id,currency,direction,
  SUM(original_amount)::numeric(20,6) AS original_amount,
  SUM(allocated_amount)::numeric(20,6) AS allocated_amount,
  SUM(outstanding_amount)::numeric(20,6) AS outstanding_amount
FROM finance.v_obligations
WHERE settlement_status<>'VOID'
GROUP BY partner_id,currency,direction;

CREATE TABLE finance.landed_cost_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE DEFAULT ('LC-' || lpad(nextval('finance.landed_cost_batch_seq')::text,9,'0')),
  shipment_id uuid NOT NULL UNIQUE REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL CHECK (currency=upper(currency)),
  allocation_basis text NOT NULL CHECK (allocation_basis IN ('QUANTITY','VALUE','WEIGHT','MANUAL')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','FINALIZED')),
  note text NOT NULL DEFAULT '',
  finalized_at timestamptz,
  finalized_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finance.landed_cost_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES finance.landed_cost_batches(id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('GOODS','FREIGHT','INSURANCE','DUTY','IMPORT_VAT','ANTI_DUMPING','COUNTERVAILING','OPERATIONAL_FEE','OTHER')),
  amount numeric(20,6) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL CHECK (currency=upper(currency)),
  batch_currency_amount numeric(20,6) NOT NULL CHECK (batch_currency_amount >= 0),
  fx_rate_id uuid REFERENCES finance.fx_rates(id) ON DELETE RESTRICT,
  source_document_id uuid REFERENCES finance.documents(id) ON DELETE RESTRICT,
  source_customs_line_id uuid REFERENCES logistics.customs_lines(id) ON DELETE RESTRICT,
  capitalizable boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_landed_components_batch_idx ON finance.landed_cost_components(batch_id,category);

CREATE TABLE finance.landed_cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES finance.landed_cost_components(id) ON DELETE RESTRICT,
  cargo_id uuid NOT NULL REFERENCES logistics.shipment_cargo(id) ON DELETE RESTRICT,
  basis_value numeric(20,6) CHECK (basis_value IS NULL OR basis_value >= 0),
  allocated_amount numeric(20,6) NOT NULL CHECK (allocated_amount >= 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_id,cargo_id)
);
CREATE INDEX finance_landed_allocations_cargo_idx ON finance.landed_cost_allocations(cargo_id,component_id);

CREATE OR REPLACE VIEW finance.v_landed_cost_by_cargo AS
SELECT lc.shipment_id,a.cargo_id,lc.currency,
  SUM(a.allocated_amount) FILTER (WHERE c.capitalizable)::numeric(20,6) AS capitalizable_cost,
  SUM(a.allocated_amount) FILTER (WHERE NOT c.capitalizable)::numeric(20,6) AS noncapitalizable_cost
FROM finance.landed_cost_allocations a
JOIN finance.landed_cost_components c ON c.id=a.component_id
JOIN finance.landed_cost_batches lc ON lc.id=c.batch_id
GROUP BY lc.shipment_id,a.cargo_id,lc.currency;

CREATE OR REPLACE FUNCTION finance.reject_append_only_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% is append-only',TG_TABLE_NAME; END; $$;

CREATE TRIGGER finance_obligations_no_mutation BEFORE UPDATE OR DELETE ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_obligation_voids_no_mutation BEFORE UPDATE OR DELETE ON finance.obligation_voids FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_payments_no_mutation BEFORE UPDATE OR DELETE ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_payment_reversals_no_mutation BEFORE UPDATE OR DELETE ON finance.payment_reversals FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_fx_rates_no_mutation BEFORE UPDATE OR DELETE ON finance.fx_rates FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_allocations_no_mutation BEFORE UPDATE OR DELETE ON finance.allocations FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_allocation_reversals_no_mutation BEFORE UPDATE OR DELETE ON finance.allocation_reversals FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();

CREATE OR REPLACE FUNCTION finance.validate_source_reference() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source_type='PROCUREMENT_PO' AND NOT EXISTS (SELECT 1 FROM procurement.purchase_orders WHERE id=NEW.source_id) THEN RAISE EXCEPTION 'Finance source Procurement PO not found'; END IF;
  IF NEW.source_type='COMMERCE_ORDER' AND NOT EXISTS (SELECT 1 FROM commerce.external_orders WHERE id=NEW.source_id) THEN RAISE EXCEPTION 'Finance source Commerce order not found'; END IF;
  IF NEW.source_type='LOGISTICS_SHIPMENT' AND NOT EXISTS (SELECT 1 FROM logistics.shipments WHERE id=NEW.source_id) THEN RAISE EXCEPTION 'Finance source Logistics Shipment not found'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_document_source_guard BEFORE INSERT OR UPDATE OF source_type,source_id ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.validate_source_reference();
CREATE TRIGGER finance_obligation_source_guard BEFORE INSERT ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.validate_source_reference();

CREATE OR REPLACE FUNCTION finance.require_draft_document() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE document_status text;
BEGIN
  SELECT status INTO document_status FROM finance.documents WHERE id=COALESCE(NEW.document_id,OLD.document_id);
  IF document_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Only draft Finance documents can edit lines'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER finance_document_lines_draft_only BEFORE INSERT OR UPDATE OR DELETE ON finance.document_lines FOR EACH ROW EXECUTE FUNCTION finance.require_draft_document();

CREATE OR REPLACE FUNCTION finance.validate_document_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE line_count integer; line_net numeric(20,6); line_tax numeric(20,6);
BEGIN
  IF NEW.status=OLD.status THEN
    IF OLD.status='POSTED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Posted Finance documents are immutable'; END IF;
    RETURN NEW;
  END IF;
  IF NOT ((OLD.status='DRAFT' AND NEW.status IN ('VERIFIED','VOIDED')) OR (OLD.status='VERIFIED' AND NEW.status IN ('POSTED','DRAFT','VOIDED'))) THEN
    RAISE EXCEPTION 'Invalid Finance document transition: % -> %',OLD.status,NEW.status;
  END IF;
  IF NEW.status='POSTED' THEN
    SELECT count(*)::int,COALESCE(sum(net_amount),0),COALESCE(sum(tax_amount),0) INTO line_count,line_net,line_tax FROM finance.document_lines WHERE document_id=NEW.id;
    IF line_count=0 THEN RAISE EXCEPTION 'Posted Finance document requires at least one line'; END IF;
    IF line_net<>NEW.subtotal_amount OR line_tax<>NEW.tax_amount OR NEW.total_amount<>NEW.subtotal_amount+NEW.tax_amount THEN RAISE EXCEPTION 'Finance document line totals must match header before posting'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_document_transition_guard BEFORE UPDATE ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.validate_document_transition();

CREATE OR REPLACE FUNCTION finance.validate_document_partner_source() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE expected_partner uuid; expected_currency text;
BEGIN
  IF NEW.source_type='PROCUREMENT_PO' THEN SELECT supplier_partner_id,currency INTO expected_partner,expected_currency FROM procurement.purchase_orders WHERE id=NEW.source_id;
  ELSIF NEW.source_type='COMMERCE_ORDER' THEN SELECT COALESCE(customer_partner_id,dealer_partner_id),currency INTO expected_partner,expected_currency FROM commerce.external_orders WHERE id=NEW.source_id;
  ELSE RETURN NEW; END IF;
  IF expected_partner IS NOT NULL AND NEW.partner_id IS DISTINCT FROM expected_partner THEN RAISE EXCEPTION 'Finance document Partner must match source Partner'; END IF;
  IF expected_currency IS NOT NULL AND NEW.currency IS DISTINCT FROM expected_currency THEN RAISE EXCEPTION 'Finance document currency must match source currency'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_document_partner_source_guard BEFORE INSERT OR UPDATE OF source_type,source_id,partner_id,currency ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.validate_document_partner_source();

CREATE OR REPLACE FUNCTION finance.validate_obligation_document() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE d finance.documents%ROWTYPE;
BEGIN
  IF NEW.document_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO d FROM finance.documents WHERE id=NEW.document_id;
  IF d.id IS NULL OR d.status<>'POSTED' THEN RAISE EXCEPTION 'Finance obligation document must be posted'; END IF;
  IF d.partner_id<>NEW.partner_id OR d.currency<>NEW.currency OR d.total_amount<>NEW.original_amount THEN RAISE EXCEPTION 'Finance obligation must match posted document Partner/currency/amount'; END IF;
  IF d.document_type='SUPPLIER_INVOICE' AND NEW.direction<>'AP' THEN RAISE EXCEPTION 'Supplier invoice creates AP obligation'; END IF;
  IF d.document_type='CUSTOMER_INVOICE' AND NEW.direction<>'AR' THEN RAISE EXCEPTION 'Customer invoice creates AR obligation'; END IF;
  IF d.document_type NOT IN ('SUPPLIER_INVOICE','CUSTOMER_INVOICE') THEN RAISE EXCEPTION 'Only supplier/customer invoices create payment obligations in this foundation'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_obligation_document_guard BEFORE INSERT ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.validate_obligation_document();

CREATE OR REPLACE FUNCTION finance.validate_allocation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE p finance.payments%ROWTYPE; o finance.obligations%ROWTYPE; fx finance.fx_rates%ROWTYPE; used_payment numeric(20,6); used_obligation numeric(20,6);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('finance-payment:'||NEW.payment_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('finance-obligation:'||NEW.obligation_id::text));
  SELECT * INTO p FROM finance.payments WHERE id=NEW.payment_id;
  SELECT * INTO o FROM finance.obligations WHERE id=NEW.obligation_id;
  IF p.id IS NULL OR o.id IS NULL THEN RAISE EXCEPTION 'Payment or obligation not found'; END IF;
  IF EXISTS (SELECT 1 FROM finance.payment_reversals WHERE payment_id=p.id) THEN RAISE EXCEPTION 'Reversed payment cannot be allocated'; END IF;
  IF EXISTS (SELECT 1 FROM finance.obligation_voids WHERE obligation_id=o.id) THEN RAISE EXCEPTION 'Voided obligation cannot be allocated'; END IF;
  IF (p.direction='INBOUND' AND o.direction<>'AR') OR (p.direction='OUTBOUND' AND o.direction<>'AP') THEN RAISE EXCEPTION 'Payment direction does not match obligation direction'; END IF;
  IF p.partner_id IS NOT NULL AND p.partner_id<>o.partner_id THEN RAISE EXCEPTION 'Payment Partner does not match obligation Partner'; END IF;
  IF p.currency=o.currency THEN
    IF NEW.fx_rate_id IS NOT NULL THEN RAISE EXCEPTION 'Same-currency allocation must not use FX rate'; END IF;
    IF NEW.payment_amount<>NEW.obligation_amount THEN RAISE EXCEPTION 'Same-currency allocation amounts must match'; END IF;
  ELSE
    IF NEW.fx_rate_id IS NULL THEN RAISE EXCEPTION 'Cross-currency allocation requires explicit FX rate'; END IF;
    SELECT * INTO fx FROM finance.fx_rates WHERE id=NEW.fx_rate_id;
    IF fx.id IS NULL OR NOT ((fx.base_currency=p.currency AND fx.quote_currency=o.currency) OR (fx.base_currency=o.currency AND fx.quote_currency=p.currency)) THEN RAISE EXCEPTION 'FX rate currencies do not match Payment/Obligation currencies'; END IF;
  END IF;
  SELECT COALESCE(sum(a.payment_amount),0) INTO used_payment FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.payment_id=p.id AND r.id IS NULL;
  SELECT COALESCE(sum(a.obligation_amount),0) INTO used_obligation FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.obligation_id=o.id AND r.id IS NULL;
  IF used_payment+NEW.payment_amount>p.amount THEN RAISE EXCEPTION 'Allocation exceeds remaining Payment amount'; END IF;
  IF used_obligation+NEW.obligation_amount>o.original_amount THEN RAISE EXCEPTION 'Allocation exceeds remaining Obligation amount'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_allocation_guard BEFORE INSERT ON finance.allocations FOR EACH ROW EXECUTE FUNCTION finance.validate_allocation();

CREATE OR REPLACE FUNCTION finance.validate_allocation_reversal() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE payment_id_value uuid; obligation_id_value uuid;
BEGIN
  SELECT payment_id,obligation_id INTO payment_id_value,obligation_id_value FROM finance.allocations WHERE id=NEW.allocation_id;
  IF payment_id_value IS NULL THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('finance-payment:'||payment_id_value::text));
  PERFORM pg_advisory_xact_lock(hashtext('finance-obligation:'||obligation_id_value::text));
  IF EXISTS (SELECT 1 FROM finance.allocation_reversals WHERE allocation_id=NEW.allocation_id) THEN RAISE EXCEPTION 'Allocation already reversed'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_allocation_reversal_guard BEFORE INSERT ON finance.allocation_reversals FOR EACH ROW EXECUTE FUNCTION finance.validate_allocation_reversal();

CREATE OR REPLACE FUNCTION finance.validate_payment_reversal() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('finance-payment:'||NEW.payment_id::text));
  IF EXISTS (SELECT 1 FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.payment_id=NEW.payment_id AND r.id IS NULL) THEN RAISE EXCEPTION 'Reverse active Payment allocations before reversing Payment'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_payment_reversal_guard BEFORE INSERT ON finance.payment_reversals FOR EACH ROW EXECUTE FUNCTION finance.validate_payment_reversal();

CREATE OR REPLACE FUNCTION finance.validate_obligation_void() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('finance-obligation:'||NEW.obligation_id::text));
  IF EXISTS (SELECT 1 FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.obligation_id=NEW.obligation_id AND r.id IS NULL) THEN RAISE EXCEPTION 'Reverse active allocations before voiding Obligation'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_obligation_void_guard BEFORE INSERT ON finance.obligation_voids FOR EACH ROW EXECUTE FUNCTION finance.validate_obligation_void();

CREATE OR REPLACE FUNCTION finance.validate_landed_component() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE batch_currency text; fx finance.fx_rates%ROWTYPE;
BEGIN
  SELECT currency INTO batch_currency FROM finance.landed_cost_batches WHERE id=NEW.batch_id;
  IF batch_currency IS NULL THEN RAISE EXCEPTION 'Landed-cost batch not found'; END IF;
  IF NEW.currency=batch_currency THEN
    IF NEW.fx_rate_id IS NOT NULL OR NEW.batch_currency_amount<>NEW.amount THEN RAISE EXCEPTION 'Same-currency landed cost must use identical batch amount without FX'; END IF;
  ELSE
    IF NEW.fx_rate_id IS NULL THEN RAISE EXCEPTION 'Cross-currency landed cost requires explicit FX rate'; END IF;
    SELECT * INTO fx FROM finance.fx_rates WHERE id=NEW.fx_rate_id;
    IF fx.id IS NULL OR NOT ((fx.base_currency=NEW.currency AND fx.quote_currency=batch_currency) OR (fx.base_currency=batch_currency AND fx.quote_currency=NEW.currency)) THEN RAISE EXCEPTION 'Landed-cost FX currencies do not match component/batch currencies'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_landed_component_guard BEFORE INSERT OR UPDATE ON finance.landed_cost_components FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_component();

CREATE OR REPLACE FUNCTION finance.require_draft_landed_batch() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE batch_id_value uuid; batch_status text;
BEGIN
  IF TG_TABLE_NAME='landed_cost_components' THEN batch_id_value=COALESCE(NEW.batch_id,OLD.batch_id); ELSE SELECT batch_id INTO batch_id_value FROM finance.landed_cost_components WHERE id=COALESCE(NEW.component_id,OLD.component_id); END IF;
  SELECT status INTO batch_status FROM finance.landed_cost_batches WHERE id=batch_id_value;
  IF batch_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER finance_landed_components_draft_only BEFORE INSERT OR UPDATE OR DELETE ON finance.landed_cost_components FOR EACH ROW EXECUTE FUNCTION finance.require_draft_landed_batch();
CREATE TRIGGER finance_landed_allocations_draft_only BEFORE INSERT OR UPDATE OR DELETE ON finance.landed_cost_allocations FOR EACH ROW EXECUTE FUNCTION finance.require_draft_landed_batch();

CREATE OR REPLACE FUNCTION finance.validate_landed_allocation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE batch_shipment uuid; cargo_shipment uuid;
BEGIN
  SELECT b.shipment_id INTO batch_shipment FROM finance.landed_cost_components c JOIN finance.landed_cost_batches b ON b.id=c.batch_id WHERE c.id=NEW.component_id;
  SELECT shipment_id INTO cargo_shipment FROM logistics.shipment_cargo WHERE id=NEW.cargo_id;
  IF batch_shipment IS NULL OR cargo_shipment IS NULL OR batch_shipment<>cargo_shipment THEN RAISE EXCEPTION 'Landed-cost allocation cargo must belong to batch Shipment'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_landed_allocation_guard BEFORE INSERT OR UPDATE ON finance.landed_cost_allocations FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_allocation();

CREATE OR REPLACE FUNCTION finance.validate_landed_batch_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE component_record record; allocated numeric(20,6);
BEGIN
  IF OLD.status='FINALIZED' THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable'; END IF;
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NOT (OLD.status='DRAFT' AND NEW.status='FINALIZED') THEN RAISE EXCEPTION 'Invalid landed-cost batch transition'; END IF;
  IF NOT EXISTS (SELECT 1 FROM finance.landed_cost_components WHERE batch_id=NEW.id) THEN RAISE EXCEPTION 'Landed-cost batch requires components before finalization'; END IF;
  FOR component_record IN SELECT * FROM finance.landed_cost_components WHERE batch_id=NEW.id AND capitalizable LOOP
    SELECT COALESCE(sum(allocated_amount),0) INTO allocated FROM finance.landed_cost_allocations WHERE component_id=component_record.id;
    IF allocated<>component_record.batch_currency_amount THEN RAISE EXCEPTION 'Capitalizable landed-cost component must be fully allocated before finalization'; END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_landed_batch_transition_guard BEFORE UPDATE ON finance.landed_cost_batches FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_batch_transition();
