CREATE OR REPLACE FUNCTION finance.validate_source_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.source_type='PROCUREMENT_PO' AND NOT EXISTS(SELECT 1 FROM procurement.purchase_orders WHERE id=NEW.source_id) THEN RAISE EXCEPTION 'Finance source Procurement PO not found'; END IF;
 IF NEW.source_type='COMMERCE_ORDER' AND NOT EXISTS(SELECT 1 FROM commerce.external_orders WHERE id=NEW.source_id) THEN RAISE EXCEPTION 'Finance source Commerce order not found'; END IF;
 IF NEW.source_type='LOGISTICS_SHIPMENT' AND NOT EXISTS(SELECT 1 FROM logistics.shipments WHERE id=NEW.source_id) THEN RAISE EXCEPTION 'Finance source Logistics Shipment not found'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_document_source_guard BEFORE INSERT OR UPDATE OF source_type,source_id ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.validate_source_reference();
CREATE TRIGGER finance_obligation_source_guard BEFORE INSERT ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.validate_source_reference();

CREATE OR REPLACE FUNCTION finance.validate_document_partner_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_partner uuid;expected_currency text;
BEGIN
 IF NEW.source_type='PROCUREMENT_PO' THEN SELECT supplier_partner_id,currency INTO expected_partner,expected_currency FROM procurement.purchase_orders WHERE id=NEW.source_id;
 ELSIF NEW.source_type='COMMERCE_ORDER' THEN SELECT COALESCE(customer_partner_id,dealer_partner_id),currency INTO expected_partner,expected_currency FROM commerce.external_orders WHERE id=NEW.source_id;IF expected_partner IS NULL THEN RAISE EXCEPTION 'Commerce order requires mapped Customer or Dealer before creating Finance document';END IF;
 ELSE RETURN NEW;END IF;
 IF NEW.partner_id IS DISTINCT FROM expected_partner THEN RAISE EXCEPTION 'Finance document Partner must match source Partner';END IF;
 IF NEW.currency IS DISTINCT FROM expected_currency THEN RAISE EXCEPTION 'Finance document currency must match source currency';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_document_partner_source_guard BEFORE INSERT OR UPDATE OF source_type,source_id,partner_id,currency ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.validate_document_partner_source();

CREATE OR REPLACE FUNCTION finance.validate_obligation_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_partner uuid;expected_currency text;
BEGIN
 IF NEW.source_type='PROCUREMENT_PO' THEN SELECT supplier_partner_id,currency INTO expected_partner,expected_currency FROM procurement.purchase_orders WHERE id=NEW.source_id;
 ELSIF NEW.source_type='COMMERCE_ORDER' THEN SELECT COALESCE(customer_partner_id,dealer_partner_id),currency INTO expected_partner,expected_currency FROM commerce.external_orders WHERE id=NEW.source_id;IF expected_partner IS NULL THEN RAISE EXCEPTION 'Commerce order requires mapped Customer or Dealer before creating Finance obligation';END IF;
 ELSE RETURN NEW;END IF;
 IF NEW.partner_id IS DISTINCT FROM expected_partner THEN RAISE EXCEPTION 'Finance obligation Partner must match source Partner';END IF;
 IF NEW.currency IS DISTINCT FROM expected_currency THEN RAISE EXCEPTION 'Finance obligation currency must match source currency';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_obligation_source_partner_guard BEFORE INSERT ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.validate_obligation_source();

CREATE OR REPLACE FUNCTION finance.require_draft_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE document_status text;document_id_value uuid;
BEGIN
 document_id_value=CASE WHEN TG_OP='DELETE' THEN OLD.document_id ELSE NEW.document_id END;
 SELECT status INTO document_status FROM finance.documents WHERE id=document_id_value;
 IF document_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Only draft Finance documents can edit lines';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $$;
CREATE TRIGGER finance_document_lines_draft_only BEFORE INSERT OR UPDATE OR DELETE ON finance.document_lines FOR EACH ROW EXECUTE FUNCTION finance.require_draft_document();

CREATE OR REPLACE FUNCTION finance.validate_document_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE line_count integer;line_net numeric(20,6);line_tax numeric(20,6);
BEGIN
 IF NEW.status=OLD.status THEN IF OLD.status IN('POSTED','VOIDED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Posted/voided Finance documents are immutable';END IF;RETURN NEW;END IF;
 IF OLD.status IN('POSTED','VOIDED') THEN RAISE EXCEPTION 'Posted/voided Finance documents are immutable';END IF;
 IF NOT((OLD.status='DRAFT' AND NEW.status IN('VERIFIED','VOIDED')) OR (OLD.status='VERIFIED' AND NEW.status IN('POSTED','DRAFT','VOIDED'))) THEN RAISE EXCEPTION 'Invalid Finance document transition: % -> %',OLD.status,NEW.status;END IF;
 IF NEW.status='POSTED' THEN SELECT count(*)::int,COALESCE(sum(net_amount),0),COALESCE(sum(tax_amount),0) INTO line_count,line_net,line_tax FROM finance.document_lines WHERE document_id=NEW.id;IF line_count=0 THEN RAISE EXCEPTION 'Posted Finance document requires at least one line';END IF;IF line_net<>NEW.subtotal_amount OR line_tax<>NEW.tax_amount OR NEW.total_amount<>NEW.subtotal_amount+NEW.tax_amount THEN RAISE EXCEPTION 'Finance document line totals must match header before posting';END IF;END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_document_transition_guard BEFORE UPDATE ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.validate_document_transition();
CREATE OR REPLACE FUNCTION finance.reject_document_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Finance documents are retained evidence and cannot be deleted';END $$;
CREATE TRIGGER finance_documents_no_delete BEFORE DELETE ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.reject_document_delete();

CREATE OR REPLACE FUNCTION finance.validate_obligation_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d finance.documents%ROWTYPE;
BEGIN
 IF NEW.document_id IS NULL THEN RETURN NEW;END IF;SELECT * INTO d FROM finance.documents WHERE id=NEW.document_id;
 IF d.id IS NULL OR d.status<>'POSTED' THEN RAISE EXCEPTION 'Finance obligation document must be posted';END IF;
 IF d.partner_id<>NEW.partner_id OR d.currency<>NEW.currency OR d.total_amount<>NEW.original_amount THEN RAISE EXCEPTION 'Finance obligation must match posted document Partner/currency/amount';END IF;
 IF d.document_type='SUPPLIER_INVOICE' AND NEW.direction<>'AP' THEN RAISE EXCEPTION 'Supplier invoice creates AP obligation';END IF;
 IF d.document_type='CUSTOMER_INVOICE' AND NEW.direction<>'AR' THEN RAISE EXCEPTION 'Customer invoice creates AR obligation';END IF;
 IF d.document_type NOT IN('SUPPLIER_INVOICE','CUSTOMER_INVOICE') THEN RAISE EXCEPTION 'Only supplier/customer invoices create payment obligations in this foundation';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER finance_obligation_document_guard BEFORE INSERT ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.validate_obligation_document();

CREATE OR REPLACE FUNCTION finance.validate_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p finance.payments%ROWTYPE;o finance.obligations%ROWTYPE;fx finance.fx_rates%ROWTYPE;used_payment numeric(20,6);used_obligation numeric(20,6);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('finance-payment:'||NEW.payment_id::text));PERFORM pg_advisory_xact_lock(hashtext('finance-obligation:'||NEW.obligation_id::text));
 SELECT * INTO p FROM finance.payments WHERE id=NEW.payment_id;SELECT * INTO o FROM finance.obligations WHERE id=NEW.obligation_id;
 IF p.id IS NULL OR o.id IS NULL THEN RAISE EXCEPTION 'Payment or obligation not found';END IF;
 IF EXISTS(SELECT 1 FROM finance.payment_reversals WHERE payment_id=p.id) THEN RAISE EXCEPTION 'Reversed payment cannot be allocated';END IF;
 IF EXISTS(SELECT 1 FROM finance.obligation_voids WHERE obligation_id=o.id) THEN RAISE EXCEPTION 'Voided obligation cannot be allocated';END IF;
 IF(p.direction='INBOUND' AND o.direction<>'AR') OR(p.direction='OUTBOUND' AND o.direction<>'AP') THEN RAISE EXCEPTION 'Payment direction does not match obligation direction';END IF;
 IF p.partner_id IS NOT NULL AND p.partner_id<>o.partner_id THEN RAISE EXCEPTION 'Payment Partner does not match obligation Partner';END IF;
 IF p.currency=o.currency THEN IF NEW.fx_rate_id IS NOT NULL THEN RAISE EXCEPTION 'Same-currency allocation must not use FX rate';END IF;IF NEW.payment_amount<>NEW.obligation_amount THEN RAISE EXCEPTION 'Same-currency allocation amounts must match';END IF;
 ELSE IF NEW.fx_rate_id IS NULL THEN RAISE EXCEPTION 'Cross-currency allocation requires explicit FX rate';END IF;SELECT * INTO fx FROM finance.fx_rates WHERE id=NEW.fx_rate_id;IF fx.id IS NULL OR NOT((fx.base_currency=p.currency AND fx.quote_currency=o.currency) OR(fx.base_currency=o.currency AND fx.quote_currency=p.currency)) THEN RAISE EXCEPTION 'FX rate currencies do not match Payment/Obligation currencies';END IF;END IF;
 SELECT COALESCE(sum(a.payment_amount),0) INTO used_payment FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.payment_id=p.id AND r.id IS NULL;
 SELECT COALESCE(sum(a.obligation_amount),0) INTO used_obligation FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.obligation_id=o.id AND r.id IS NULL;
 IF used_payment+NEW.payment_amount>p.amount THEN RAISE EXCEPTION 'Allocation exceeds remaining Payment amount';END IF;IF used_obligation+NEW.obligation_amount>o.original_amount THEN RAISE EXCEPTION 'Allocation exceeds remaining Obligation amount';END IF;RETURN NEW;
END $$;
CREATE TRIGGER finance_allocation_guard BEFORE INSERT ON finance.allocations FOR EACH ROW EXECUTE FUNCTION finance.validate_allocation();

CREATE OR REPLACE FUNCTION finance.validate_allocation_reversal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payment_value uuid;obligation_value uuid;BEGIN SELECT payment_id,obligation_id INTO payment_value,obligation_value FROM finance.allocations WHERE id=NEW.allocation_id;IF payment_value IS NULL THEN RAISE EXCEPTION 'Allocation not found';END IF;PERFORM pg_advisory_xact_lock(hashtext('finance-payment:'||payment_value::text));PERFORM pg_advisory_xact_lock(hashtext('finance-obligation:'||obligation_value::text));IF EXISTS(SELECT 1 FROM finance.allocation_reversals WHERE allocation_id=NEW.allocation_id) THEN RAISE EXCEPTION 'Allocation already reversed';END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_allocation_reversal_guard BEFORE INSERT ON finance.allocation_reversals FOR EACH ROW EXECUTE FUNCTION finance.validate_allocation_reversal();
CREATE OR REPLACE FUNCTION finance.validate_payment_reversal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('finance-payment:'||NEW.payment_id::text));IF EXISTS(SELECT 1 FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.payment_id=NEW.payment_id AND r.id IS NULL) THEN RAISE EXCEPTION 'Reverse active Payment allocations before reversing Payment';END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_payment_reversal_guard BEFORE INSERT ON finance.payment_reversals FOR EACH ROW EXECUTE FUNCTION finance.validate_payment_reversal();
CREATE OR REPLACE FUNCTION finance.validate_obligation_void() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('finance-obligation:'||NEW.obligation_id::text));IF EXISTS(SELECT 1 FROM finance.allocations a LEFT JOIN finance.allocation_reversals r ON r.allocation_id=a.id WHERE a.obligation_id=NEW.obligation_id AND r.id IS NULL) THEN RAISE EXCEPTION 'Reverse active allocations before voiding Obligation';END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_obligation_void_guard BEFORE INSERT ON finance.obligation_voids FOR EACH ROW EXECUTE FUNCTION finance.validate_obligation_void();

CREATE OR REPLACE FUNCTION finance.validate_landed_component() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE batch_currency text;fx finance.fx_rates%ROWTYPE;BEGIN SELECT currency INTO batch_currency FROM finance.landed_cost_batches WHERE id=NEW.batch_id;IF batch_currency IS NULL THEN RAISE EXCEPTION 'Landed-cost batch not found';END IF;
 IF NEW.currency=batch_currency THEN IF NEW.fx_rate_id IS NOT NULL OR NEW.batch_currency_amount<>NEW.amount THEN RAISE EXCEPTION 'Same-currency landed cost must use identical batch amount without FX';END IF;
 ELSE IF NEW.fx_rate_id IS NULL THEN RAISE EXCEPTION 'Cross-currency landed cost requires explicit FX rate';END IF;SELECT * INTO fx FROM finance.fx_rates WHERE id=NEW.fx_rate_id;IF fx.id IS NULL OR NOT((fx.base_currency=NEW.currency AND fx.quote_currency=batch_currency) OR(fx.base_currency=batch_currency AND fx.quote_currency=NEW.currency)) THEN RAISE EXCEPTION 'Landed-cost FX currencies do not match component/batch currencies';END IF;END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_landed_component_guard BEFORE INSERT OR UPDATE ON finance.landed_cost_components FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_component();

CREATE OR REPLACE FUNCTION finance.validate_landed_component_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE batch_shipment uuid;customs_shipment uuid;document_status text;BEGIN SELECT shipment_id INTO batch_shipment FROM finance.landed_cost_batches WHERE id=NEW.batch_id;
 IF NEW.source_customs_line_id IS NOT NULL THEN SELECT d.shipment_id INTO customs_shipment FROM logistics.customs_lines l JOIN logistics.customs_declarations d ON d.id=l.declaration_id WHERE l.id=NEW.source_customs_line_id;IF customs_shipment IS NULL OR customs_shipment<>batch_shipment THEN RAISE EXCEPTION 'Landed-cost customs source must belong to batch Shipment';END IF;END IF;
 IF NEW.source_document_id IS NOT NULL THEN SELECT status INTO document_status FROM finance.documents WHERE id=NEW.source_document_id;IF document_status IS DISTINCT FROM 'POSTED' THEN RAISE EXCEPTION 'Landed-cost Finance document source must be posted';END IF;END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_landed_component_source_guard BEFORE INSERT OR UPDATE OF batch_id,source_customs_line_id,source_document_id ON finance.landed_cost_components FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_component_source();

CREATE OR REPLACE FUNCTION finance.require_draft_landed_batch() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE batch_id_value uuid;batch_status text;component_value uuid;BEGIN IF TG_TABLE_NAME='landed_cost_components' THEN batch_id_value=CASE WHEN TG_OP='DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;ELSE component_value=CASE WHEN TG_OP='DELETE' THEN OLD.component_id ELSE NEW.component_id END;SELECT batch_id INTO batch_id_value FROM finance.landed_cost_components WHERE id=component_value;END IF;SELECT status INTO batch_status FROM finance.landed_cost_batches WHERE id=batch_id_value;IF batch_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable';END IF;IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END $$;
CREATE TRIGGER finance_landed_components_draft_only BEFORE INSERT OR UPDATE OR DELETE ON finance.landed_cost_components FOR EACH ROW EXECUTE FUNCTION finance.require_draft_landed_batch();
CREATE TRIGGER finance_landed_allocations_draft_only BEFORE INSERT OR UPDATE OR DELETE ON finance.landed_cost_allocations FOR EACH ROW EXECUTE FUNCTION finance.require_draft_landed_batch();
CREATE OR REPLACE FUNCTION finance.protect_finalized_landed_batch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Landed-cost batches are retained evidence and cannot be deleted';END IF;IF OLD.status='FINALIZED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable';END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_landed_batch_protection BEFORE UPDATE OR DELETE ON finance.landed_cost_batches FOR EACH ROW EXECUTE FUNCTION finance.protect_finalized_landed_batch();

CREATE OR REPLACE FUNCTION finance.validate_landed_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE batch_shipment uuid;cargo_shipment uuid;component_amount numeric(20,6);used_amount numeric(20,6);BEGIN PERFORM pg_advisory_xact_lock(hashtext('finance-landed-component:'||NEW.component_id::text));SELECT b.shipment_id,c.batch_currency_amount INTO batch_shipment,component_amount FROM finance.landed_cost_components c JOIN finance.landed_cost_batches b ON b.id=c.batch_id WHERE c.id=NEW.component_id;SELECT shipment_id INTO cargo_shipment FROM logistics.shipment_cargo WHERE id=NEW.cargo_id;IF batch_shipment IS NULL OR cargo_shipment IS NULL OR batch_shipment<>cargo_shipment THEN RAISE EXCEPTION 'Landed-cost allocation cargo must belong to batch Shipment';END IF;SELECT COALESCE(sum(allocated_amount),0) INTO used_amount FROM finance.landed_cost_allocations WHERE component_id=NEW.component_id AND(TG_OP='INSERT' OR id<>NEW.id);IF used_amount+NEW.allocated_amount>component_amount THEN RAISE EXCEPTION 'Landed-cost allocation exceeds component batch-currency amount';END IF;RETURN NEW;END $$;
CREATE TRIGGER finance_landed_allocation_guard BEFORE INSERT OR UPDATE ON finance.landed_cost_allocations FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_allocation();

CREATE OR REPLACE FUNCTION finance.validate_landed_batch_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE component_record record;allocated numeric(20,6);BEGIN IF OLD.status='FINALIZED' THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable';END IF;IF NEW.status=OLD.status THEN RETURN NEW;END IF;IF NOT(OLD.status='DRAFT' AND NEW.status='FINALIZED') THEN RAISE EXCEPTION 'Invalid landed-cost batch transition';END IF;IF NOT EXISTS(SELECT 1 FROM finance.landed_cost_components WHERE batch_id=NEW.id) THEN RAISE EXCEPTION 'Landed-cost batch requires components before finalization';END IF;FOR component_record IN SELECT * FROM finance.landed_cost_components WHERE batch_id=NEW.id AND capitalizable LOOP SELECT COALESCE(sum(allocated_amount),0) INTO allocated FROM finance.landed_cost_allocations WHERE component_id=component_record.id;IF allocated<>component_record.batch_currency_amount THEN RAISE EXCEPTION 'Capitalizable landed-cost component must be fully allocated before finalization';END IF;END LOOP;RETURN NEW;END $$;
CREATE TRIGGER finance_landed_batch_transition_guard BEFORE UPDATE ON finance.landed_cost_batches FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_batch_transition();
