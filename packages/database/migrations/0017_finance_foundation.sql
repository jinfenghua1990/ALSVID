CREATE SCHEMA IF NOT EXISTS finance;

INSERT INTO identity.permissions(id,description) VALUES
 ('finance.read','View ALSVID finance documents obligations payments and settlements'),
 ('finance.document.write','Create and edit draft Finance documents'),
 ('finance.document.post','Verify and post Finance documents and obligations'),
 ('finance.payment.write','Record payment evidence and explicit reversals'),
 ('finance.allocate','Allocate payments to obligations and reverse allocations'),
 ('finance.reconcile','Resolve Finance reconciliation exceptions'),
 ('finance.landed_cost','Build and finalize Shipment landed-cost allocations')
ON CONFLICT(id) DO NOTHING;
INSERT INTO identity.roles(id,name,description) VALUES
 ('finance_manager','Finance manager','Manage ALSVID commercial Finance facts and reconciliation'),
 ('finance_operator','Finance operator','Record documents payments and allocations'),
 ('finance_viewer','Finance viewer','Read-only Finance visibility')
ON CONFLICT(id) DO NOTHING;
INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('finance_manager','finance.read'),('finance_manager','finance.document.write'),('finance_manager','finance.document.post'),('finance_manager','finance.payment.write'),('finance_manager','finance.allocate'),('finance_manager','finance.reconcile'),('finance_manager','finance.landed_cost'),
 ('finance_operator','finance.read'),('finance_operator','finance.document.write'),('finance_operator','finance.payment.write'),('finance_operator','finance.allocate'),('finance_viewer','finance.read')
ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions(role_id,permission_id) SELECT 'system_admin',id FROM identity.permissions WHERE id LIKE 'finance.%' ON CONFLICT DO NOTHING;

CREATE SEQUENCE finance.document_number_seq START 1;
CREATE SEQUENCE finance.obligation_number_seq START 1;
CREATE SEQUENCE finance.payment_number_seq START 1;
CREATE SEQUENCE finance.landed_cost_batch_seq START 1;

CREATE TABLE finance.documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_number text NOT NULL UNIQUE DEFAULT ('FIN-DOC-'||lpad(nextval('finance.document_number_seq')::text,9,'0')),
 document_type text NOT NULL CHECK(document_type IN('SUPPLIER_INVOICE','CUSTOMER_INVOICE','SUPPLIER_CREDIT_NOTE','CUSTOMER_CREDIT_NOTE','DEBIT_NOTE','OTHER')),
 partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
 external_reference text,
 currency char(3) NOT NULL CHECK(currency=upper(currency) AND length(trim(currency))=3),
 issue_date date NOT NULL,due_date date,
 subtotal_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK(subtotal_amount>=0),
 tax_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
 total_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK(total_amount>=0),
 source_type text NOT NULL DEFAULT 'MANUAL' CHECK(source_type IN('PROCUREMENT_PO','COMMERCE_ORDER','LOGISTICS_SHIPMENT','MANUAL')),
 source_id uuid,status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','VERIFIED','POSTED','VOIDED')),
 note text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1 CHECK(version>0),
 verified_at timestamptz,verified_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 posted_at timestamptz,posted_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 voided_at timestamptz,voided_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,void_reason text,
 created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(due_date IS NULL OR due_date>=issue_date),CHECK(total_amount=subtotal_amount+tax_amount),
 CHECK((source_type='MANUAL' AND source_id IS NULL) OR (source_type<>'MANUAL' AND source_id IS NOT NULL))
);
CREATE UNIQUE INDEX finance_document_partner_external_uq ON finance.documents(partner_id,document_type,external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX finance_documents_partner_idx ON finance.documents(partner_id,issue_date DESC);
CREATE INDEX finance_documents_status_idx ON finance.documents(status,issue_date DESC);

CREATE TABLE finance.document_lines(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_id uuid NOT NULL REFERENCES finance.documents(id) ON DELETE CASCADE,
 line_no integer NOT NULL CHECK(line_no>0),category text NOT NULL CHECK(category IN('GOODS','FREIGHT','INSURANCE','DUTY','IMPORT_VAT','ANTI_DUMPING','COUNTERVAILING','OPERATIONAL_FEE','SERVICE','OTHER')),
 description text NOT NULL DEFAULT '',quantity numeric(18,6) NOT NULL DEFAULT 1 CHECK(quantity>0),unit text NOT NULL DEFAULT 'EA',unit_price numeric(20,6) NOT NULL DEFAULT 0 CHECK(unit_price>=0),
 net_amount numeric(20,6) NOT NULL CHECK(net_amount>=0),tax_amount numeric(20,6) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
 sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,shipment_id uuid REFERENCES logistics.shipments(id) ON DELETE RESTRICT,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,line_no)
);
CREATE INDEX finance_document_lines_document_idx ON finance.document_lines(document_id,line_no);

CREATE TABLE finance.obligations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),obligation_number text NOT NULL UNIQUE DEFAULT ('OBL-'||lpad(nextval('finance.obligation_number_seq')::text,9,'0')),
 direction text NOT NULL CHECK(direction IN('AR','AP')),partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,document_id uuid UNIQUE REFERENCES finance.documents(id) ON DELETE RESTRICT,
 currency char(3) NOT NULL CHECK(currency=upper(currency)),original_amount numeric(20,6) NOT NULL CHECK(original_amount>0),due_date date,
 source_type text NOT NULL DEFAULT 'MANUAL' CHECK(source_type IN('PROCUREMENT_PO','COMMERCE_ORDER','LOGISTICS_SHIPMENT','MANUAL')),source_id uuid,note text NOT NULL DEFAULT '',created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((source_type='MANUAL' AND source_id IS NULL) OR (source_type<>'MANUAL' AND source_id IS NOT NULL))
);
CREATE INDEX finance_obligations_partner_idx ON finance.obligations(partner_id,direction,due_date);
CREATE TABLE finance.obligation_voids(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),obligation_id uuid NOT NULL UNIQUE REFERENCES finance.obligations(id) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(trim(reason))>0),voided_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,voided_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE finance.payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payment_number text NOT NULL UNIQUE DEFAULT ('PAY-'||lpad(nextval('finance.payment_number_seq')::text,9,'0')),
 direction text NOT NULL CHECK(direction IN('INBOUND','OUTBOUND')),partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,currency char(3) NOT NULL CHECK(currency=upper(currency)),amount numeric(20,6) NOT NULL CHECK(amount>0),value_date date NOT NULL,
 provider text NOT NULL DEFAULT 'MANUAL',account_reference text,external_reference text,idempotency_key text NOT NULL UNIQUE CHECK(length(trim(idempotency_key))>0),note text NOT NULL DEFAULT '',posted_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_payments_partner_idx ON finance.payments(partner_id,value_date DESC);
CREATE TABLE finance.payment_reversals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payment_id uuid NOT NULL UNIQUE REFERENCES finance.payments(id) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(trim(reason))>0),reversed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,reversed_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE finance.fx_rates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),base_currency char(3) NOT NULL CHECK(base_currency=upper(base_currency)),quote_currency char(3) NOT NULL CHECK(quote_currency=upper(quote_currency)),rate numeric(24,12) NOT NULL CHECK(rate>0),effective_at timestamptz NOT NULL,source text NOT NULL CHECK(length(trim(source))>0),external_reference text,created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),CHECK(base_currency<>quote_currency),UNIQUE(base_currency,quote_currency,effective_at,source)
);
CREATE INDEX finance_fx_rates_lookup_idx ON finance.fx_rates(base_currency,quote_currency,effective_at DESC);

CREATE TABLE finance.allocations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),payment_id uuid NOT NULL REFERENCES finance.payments(id) ON DELETE RESTRICT,obligation_id uuid NOT NULL REFERENCES finance.obligations(id) ON DELETE RESTRICT,payment_amount numeric(20,6) NOT NULL CHECK(payment_amount>0),obligation_amount numeric(20,6) NOT NULL CHECK(obligation_amount>0),fx_rate_id uuid REFERENCES finance.fx_rates(id) ON DELETE RESTRICT,note text NOT NULL DEFAULT '',allocated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,allocated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_allocations_payment_idx ON finance.allocations(payment_id,allocated_at,id);
CREATE INDEX finance_allocations_obligation_idx ON finance.allocations(obligation_id,allocated_at,id);
CREATE TABLE finance.allocation_reversals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),allocation_id uuid NOT NULL UNIQUE REFERENCES finance.allocations(id) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(trim(reason))>0),reversed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,reversed_at timestamptz NOT NULL DEFAULT now());

CREATE OR REPLACE VIEW finance.v_obligations AS
SELECT o.*,COALESCE(SUM(a.obligation_amount) FILTER(WHERE ar.id IS NULL),0)::numeric(20,6) allocated_amount,
 (o.original_amount-COALESCE(SUM(a.obligation_amount) FILTER(WHERE ar.id IS NULL),0))::numeric(20,6) outstanding_amount,
 CASE WHEN ov.id IS NOT NULL THEN 'VOID' WHEN COALESCE(SUM(a.obligation_amount) FILTER(WHERE ar.id IS NULL),0)=0 THEN 'OPEN' WHEN COALESCE(SUM(a.obligation_amount) FILTER(WHERE ar.id IS NULL),0)>=o.original_amount THEN 'SETTLED' ELSE 'PARTIALLY_SETTLED' END settlement_status,
 CASE WHEN ov.id IS NULL AND o.due_date IS NOT NULL AND o.due_date<current_date AND o.original_amount-COALESCE(SUM(a.obligation_amount) FILTER(WHERE ar.id IS NULL),0)>0 THEN current_date-o.due_date ELSE 0 END days_overdue
FROM finance.obligations o LEFT JOIN finance.obligation_voids ov ON ov.obligation_id=o.id LEFT JOIN finance.allocations a ON a.obligation_id=o.id LEFT JOIN finance.allocation_reversals ar ON ar.allocation_id=a.id GROUP BY o.id,ov.id;
CREATE OR REPLACE VIEW finance.v_payments AS
SELECT p.*,COALESCE(SUM(a.payment_amount) FILTER(WHERE ar.id IS NULL),0)::numeric(20,6) allocated_amount,
 (p.amount-COALESCE(SUM(a.payment_amount) FILTER(WHERE ar.id IS NULL),0))::numeric(20,6) unallocated_amount,
 CASE WHEN pr.id IS NOT NULL THEN 'REVERSED' WHEN COALESCE(SUM(a.payment_amount) FILTER(WHERE ar.id IS NULL),0)=0 THEN 'UNALLOCATED' WHEN COALESCE(SUM(a.payment_amount) FILTER(WHERE ar.id IS NULL),0)>=p.amount THEN 'ALLOCATED' ELSE 'PARTIAL' END allocation_status
FROM finance.payments p LEFT JOIN finance.payment_reversals pr ON pr.payment_id=p.id LEFT JOIN finance.allocations a ON a.payment_id=p.id LEFT JOIN finance.allocation_reversals ar ON ar.allocation_id=a.id GROUP BY p.id,pr.id;
CREATE OR REPLACE VIEW finance.v_partner_balances AS SELECT partner_id,currency,direction,SUM(original_amount)::numeric(20,6) original_amount,SUM(allocated_amount)::numeric(20,6) allocated_amount,SUM(outstanding_amount)::numeric(20,6) outstanding_amount FROM finance.v_obligations WHERE settlement_status<>'VOID' GROUP BY partner_id,currency,direction;

CREATE TABLE finance.landed_cost_batches(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),batch_number text NOT NULL UNIQUE DEFAULT ('LC-'||lpad(nextval('finance.landed_cost_batch_seq')::text,9,'0')),shipment_id uuid NOT NULL UNIQUE REFERENCES logistics.shipments(id) ON DELETE RESTRICT,currency char(3) NOT NULL CHECK(currency=upper(currency)),allocation_basis text NOT NULL CHECK(allocation_basis IN('QUANTITY','VALUE','WEIGHT','MANUAL')),status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','FINALIZED')),note text NOT NULL DEFAULT '',finalized_at timestamptz,finalized_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE finance.landed_cost_components(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),batch_id uuid NOT NULL REFERENCES finance.landed_cost_batches(id) ON DELETE RESTRICT,category text NOT NULL CHECK(category IN('GOODS','FREIGHT','INSURANCE','DUTY','IMPORT_VAT','ANTI_DUMPING','COUNTERVAILING','OPERATIONAL_FEE','OTHER')),amount numeric(20,6) NOT NULL CHECK(amount>=0),currency char(3) NOT NULL CHECK(currency=upper(currency)),batch_currency_amount numeric(20,6) NOT NULL CHECK(batch_currency_amount>=0),fx_rate_id uuid REFERENCES finance.fx_rates(id) ON DELETE RESTRICT,source_document_id uuid REFERENCES finance.documents(id) ON DELETE RESTRICT,source_customs_line_id uuid REFERENCES logistics.customs_lines(id) ON DELETE RESTRICT,capitalizable boolean NOT NULL DEFAULT true,note text NOT NULL DEFAULT '',created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_landed_components_batch_idx ON finance.landed_cost_components(batch_id,category);
CREATE TABLE finance.landed_cost_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),component_id uuid NOT NULL REFERENCES finance.landed_cost_components(id) ON DELETE RESTRICT,cargo_id uuid NOT NULL REFERENCES logistics.shipment_cargo(id) ON DELETE RESTRICT,basis_value numeric(20,6) CHECK(basis_value IS NULL OR basis_value>=0),allocated_amount numeric(20,6) NOT NULL CHECK(allocated_amount>=0),created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(component_id,cargo_id));
CREATE OR REPLACE VIEW finance.v_landed_cost_by_cargo AS SELECT b.shipment_id,a.cargo_id,b.currency,SUM(a.allocated_amount) FILTER(WHERE c.capitalizable)::numeric(20,6) capitalizable_cost,SUM(a.allocated_amount) FILTER(WHERE NOT c.capitalizable)::numeric(20,6) noncapitalizable_cost FROM finance.landed_cost_allocations a JOIN finance.landed_cost_components c ON c.id=a.component_id JOIN finance.landed_cost_batches b ON b.id=c.batch_id GROUP BY b.shipment_id,a.cargo_id,b.currency;

CREATE OR REPLACE FUNCTION finance.reject_append_only_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% is append-only',TG_TABLE_NAME; END; $$;
CREATE TRIGGER finance_obligations_no_mutation BEFORE UPDATE OR DELETE ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_obligation_voids_no_mutation BEFORE UPDATE OR DELETE ON finance.obligation_voids FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_payments_no_mutation BEFORE UPDATE OR DELETE ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_payment_reversals_no_mutation BEFORE UPDATE OR DELETE ON finance.payment_reversals FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_fx_rates_no_mutation BEFORE UPDATE OR DELETE ON finance.fx_rates FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_allocations_no_mutation BEFORE UPDATE OR DELETE ON finance.allocations FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
CREATE TRIGGER finance_allocation_reversals_no_mutation BEFORE UPDATE OR DELETE ON finance.allocation_reversals FOR EACH ROW EXECUTE FUNCTION finance.reject_append_only_mutation();
