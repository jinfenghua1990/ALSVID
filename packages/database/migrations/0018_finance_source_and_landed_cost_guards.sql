CREATE OR REPLACE FUNCTION finance.validate_obligation_source() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE expected_partner uuid; expected_currency text;
BEGIN
  IF NEW.source_type='PROCUREMENT_PO' THEN
    SELECT supplier_partner_id,currency INTO expected_partner,expected_currency FROM procurement.purchase_orders WHERE id=NEW.source_id;
  ELSIF NEW.source_type='COMMERCE_ORDER' THEN
    SELECT COALESCE(customer_partner_id,dealer_partner_id),currency INTO expected_partner,expected_currency FROM commerce.external_orders WHERE id=NEW.source_id;
    IF expected_partner IS NULL THEN RAISE EXCEPTION 'Commerce order requires mapped Customer or Dealer before creating Finance obligation'; END IF;
  ELSE
    RETURN NEW;
  END IF;
  IF NEW.partner_id IS DISTINCT FROM expected_partner THEN RAISE EXCEPTION 'Finance obligation Partner must match source Partner'; END IF;
  IF NEW.currency IS DISTINCT FROM expected_currency THEN RAISE EXCEPTION 'Finance obligation currency must match source currency'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS finance_obligation_source_partner_guard ON finance.obligations;
CREATE TRIGGER finance_obligation_source_partner_guard BEFORE INSERT ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.validate_obligation_source();

CREATE OR REPLACE FUNCTION finance.validate_landed_component_source() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE batch_shipment uuid; customs_shipment uuid; document_status text;
BEGIN
  SELECT shipment_id INTO batch_shipment FROM finance.landed_cost_batches WHERE id=NEW.batch_id;
  IF NEW.source_customs_line_id IS NOT NULL THEN
    SELECT d.shipment_id INTO customs_shipment FROM logistics.customs_lines l JOIN logistics.customs_declarations d ON d.id=l.declaration_id WHERE l.id=NEW.source_customs_line_id;
    IF customs_shipment IS NULL OR customs_shipment<>batch_shipment THEN RAISE EXCEPTION 'Landed-cost customs source must belong to batch Shipment'; END IF;
  END IF;
  IF NEW.source_document_id IS NOT NULL THEN
    SELECT status INTO document_status FROM finance.documents WHERE id=NEW.source_document_id;
    IF document_status IS DISTINCT FROM 'POSTED' THEN RAISE EXCEPTION 'Landed-cost Finance document source must be posted'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS finance_landed_component_source_guard ON finance.landed_cost_components;
CREATE TRIGGER finance_landed_component_source_guard BEFORE INSERT OR UPDATE OF batch_id,source_customs_line_id,source_document_id ON finance.landed_cost_components FOR EACH ROW EXECUTE FUNCTION finance.validate_landed_component_source();

CREATE OR REPLACE FUNCTION finance.validate_landed_allocation() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE batch_shipment uuid; cargo_shipment uuid; component_amount numeric(20,6); used_amount numeric(20,6);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('finance-landed-component:'||NEW.component_id::text));
  SELECT b.shipment_id,c.batch_currency_amount INTO batch_shipment,component_amount FROM finance.landed_cost_components c JOIN finance.landed_cost_batches b ON b.id=c.batch_id WHERE c.id=NEW.component_id;
  SELECT shipment_id INTO cargo_shipment FROM logistics.shipment_cargo WHERE id=NEW.cargo_id;
  IF batch_shipment IS NULL OR cargo_shipment IS NULL OR batch_shipment<>cargo_shipment THEN RAISE EXCEPTION 'Landed-cost allocation cargo must belong to batch Shipment'; END IF;
  SELECT COALESCE(sum(allocated_amount),0) INTO used_amount FROM finance.landed_cost_allocations WHERE component_id=NEW.component_id AND (TG_OP='INSERT' OR id<>NEW.id);
  IF used_amount+NEW.allocated_amount>component_amount THEN RAISE EXCEPTION 'Landed-cost allocation exceeds component batch-currency amount'; END IF;
  RETURN NEW;
END;
$$;
