CREATE OR REPLACE FUNCTION finance.validate_document_partner_source() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE expected_partner uuid; expected_currency text;
BEGIN
  IF NEW.source_type='PROCUREMENT_PO' THEN
    SELECT supplier_partner_id,currency INTO expected_partner,expected_currency FROM procurement.purchase_orders WHERE id=NEW.source_id;
  ELSIF NEW.source_type='COMMERCE_ORDER' THEN
    SELECT COALESCE(customer_partner_id,dealer_partner_id),currency INTO expected_partner,expected_currency FROM commerce.external_orders WHERE id=NEW.source_id;
    IF expected_partner IS NULL THEN RAISE EXCEPTION 'Commerce order requires mapped Customer or Dealer before creating Finance document'; END IF;
  ELSE
    RETURN NEW;
  END IF;
  IF expected_partner IS NOT NULL AND NEW.partner_id IS DISTINCT FROM expected_partner THEN RAISE EXCEPTION 'Finance document Partner must match source Partner'; END IF;
  IF expected_currency IS NOT NULL AND NEW.currency IS DISTINCT FROM expected_currency THEN RAISE EXCEPTION 'Finance document currency must match source currency'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION finance.validate_document_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE line_count integer; line_net numeric(20,6); line_tax numeric(20,6);
BEGIN
  IF NEW.status=OLD.status THEN
    IF OLD.status IN ('POSTED','VOIDED') AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Posted/voided Finance documents are immutable'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IN ('POSTED','VOIDED') THEN RAISE EXCEPTION 'Posted/voided Finance documents are immutable'; END IF;
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

CREATE OR REPLACE FUNCTION finance.reject_document_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Finance documents are retained evidence and cannot be deleted';
END;
$$;
DROP TRIGGER IF EXISTS finance_documents_no_delete ON finance.documents;
CREATE TRIGGER finance_documents_no_delete BEFORE DELETE ON finance.documents FOR EACH ROW EXECUTE FUNCTION finance.reject_document_delete();

CREATE OR REPLACE FUNCTION finance.require_draft_landed_batch() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE batch_id_value uuid; batch_status text; component_id_value uuid;
BEGIN
  IF TG_TABLE_NAME='landed_cost_components' THEN
    IF TG_OP='DELETE' THEN batch_id_value=OLD.batch_id; ELSE batch_id_value=NEW.batch_id; END IF;
  ELSE
    IF TG_OP='DELETE' THEN component_id_value=OLD.component_id; ELSE component_id_value=NEW.component_id; END IF;
    SELECT batch_id INTO batch_id_value FROM finance.landed_cost_components WHERE id=component_id_value;
  END IF;
  SELECT status INTO batch_status FROM finance.landed_cost_batches WHERE id=batch_id_value;
  IF batch_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION finance.protect_finalized_landed_batch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Landed-cost batches are retained evidence and cannot be deleted'; END IF;
  IF OLD.status='FINALIZED' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Finalized landed-cost batch is immutable'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS finance_landed_batch_protection ON finance.landed_cost_batches;
CREATE TRIGGER finance_landed_batch_protection BEFORE UPDATE OR DELETE ON finance.landed_cost_batches FOR EACH ROW EXECUTE FUNCTION finance.protect_finalized_landed_batch();
