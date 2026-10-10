ALTER TABLE integrations.webhook_receipts
  DROP CONSTRAINT IF EXISTS webhook_receipts_channel_id_payload_sha256_key;
CREATE INDEX IF NOT EXISTS integrations_webhook_payload_hash_idx
  ON integrations.webhook_receipts(channel_id, payload_sha256, received_at DESC);

CREATE OR REPLACE FUNCTION dealer.validate_status_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status=OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status='PROSPECT' AND NEW.status IN ('ACTIVE','CLOSED')) OR
    (OLD.status='ACTIVE' AND NEW.status IN ('SUSPENDED','CLOSED')) OR
    (OLD.status='SUSPENDED' AND NEW.status IN ('ACTIVE','CLOSED'))
  ) THEN
    RAISE EXCEPTION 'Invalid Dealer transition: % -> %',OLD.status,NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dealer_status_transition_guard
BEFORE UPDATE OF status ON dealer.dealers
FOR EACH ROW EXECUTE FUNCTION dealer.validate_status_transition();

CREATE OR REPLACE FUNCTION commerce.reject_order_source_regression() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.source_updated_at IS NOT NULL AND NEW.source_updated_at IS NOT NULL AND NEW.source_updated_at < OLD.source_updated_at THEN
    RAISE EXCEPTION 'External order source_updated_at cannot move backwards';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_order_source_clock_guard
BEFORE UPDATE OF source_updated_at ON commerce.external_orders
FOR EACH ROW EXECUTE FUNCTION commerce.reject_order_source_regression();

CREATE OR REPLACE FUNCTION commerce.reject_line_source_regression() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.source_updated_at IS NOT NULL AND NEW.source_updated_at IS NOT NULL AND NEW.source_updated_at < OLD.source_updated_at THEN
    RAISE EXCEPTION 'External order line source_updated_at cannot move backwards';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_line_source_clock_guard
BEFORE UPDATE OF source_updated_at ON commerce.external_order_lines
FOR EACH ROW EXECUTE FUNCTION commerce.reject_line_source_regression();

CREATE OR REPLACE FUNCTION commerce.reject_fulfillment_source_regression() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.source_updated_at IS NOT NULL AND NEW.source_updated_at IS NOT NULL AND NEW.source_updated_at < OLD.source_updated_at THEN
    RAISE EXCEPTION 'External fulfillment source_updated_at cannot move backwards';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_fulfillment_source_clock_guard
BEFORE UPDATE OF source_updated_at ON commerce.fulfillments
FOR EACH ROW EXECUTE FUNCTION commerce.reject_fulfillment_source_regression();

CREATE OR REPLACE FUNCTION commerce.protect_line_provider_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.external_line_id IS DISTINCT FROM OLD.external_line_id OR
     NEW.external_product_id IS DISTINCT FROM OLD.external_product_id OR NEW.external_variant_id IS DISTINCT FROM OLD.external_variant_id OR
     NEW.external_sku IS DISTINCT FROM OLD.external_sku THEN
    RAISE EXCEPTION 'External order line provider identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_line_provider_identity_guard
BEFORE UPDATE ON commerce.external_order_lines
FOR EACH ROW EXECUTE FUNCTION commerce.protect_line_provider_identity();

CREATE OR REPLACE FUNCTION commerce.protect_fulfillment_provider_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.channel_id IS DISTINCT FROM OLD.channel_id OR NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.external_fulfillment_id IS DISTINCT FROM OLD.external_fulfillment_id THEN
    RAISE EXCEPTION 'External fulfillment provider identity is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_fulfillment_provider_identity_guard
BEFORE UPDATE ON commerce.fulfillments
FOR EACH ROW EXECUTE FUNCTION commerce.protect_fulfillment_provider_identity();
