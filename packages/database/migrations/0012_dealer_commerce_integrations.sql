CREATE SCHEMA IF NOT EXISTS dealer;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS integrations;

INSERT INTO identity.permissions(id, description) VALUES
  ('dealer.read', 'View Dealer business profiles and status'),
  ('dealer.write', 'Create and update Dealer business profiles'),
  ('commerce.read', 'View external commerce channel/order/fulfillment facts'),
  ('commerce.map', 'Manage external SKU, Partner, Shipment and Vehicle mappings'),
  ('commerce.reconcile', 'Resolve commerce mapping and reconciliation exceptions'),
  ('integrations.ingest', 'Ingest provider events through approved adapters'),
  ('integrations.replay', 'Replay retained provider evidence through approved adapters'),
  ('integrations.admin', 'Manage integration sync cursors and provider control configuration')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('dealer_manager', 'Dealer manager', 'Manage Dealer business profiles and policy state'),
  ('commerce_manager', 'Commerce manager', 'Manage external commerce facts, mappings and reconciliation'),
  ('integration_operator', 'Integration operator', 'Operate provider ingestion, replay and sync controls'),
  ('commerce_viewer', 'Commerce viewer', 'Read-only Dealer and Commerce visibility')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('dealer_manager','dealer.read'),('dealer_manager','dealer.write'),('dealer_manager','partner.read'),
  ('commerce_manager','dealer.read'),('commerce_manager','commerce.read'),('commerce_manager','commerce.map'),('commerce_manager','commerce.reconcile'),('commerce_manager','partner.read'),('commerce_manager','product.read'),
  ('integration_operator','commerce.read'),('integration_operator','integrations.ingest'),('integration_operator','integrations.replay'),('integration_operator','integrations.admin'),
  ('commerce_viewer','dealer.read'),('commerce_viewer','commerce.read'),('commerce_viewer','partner.read')
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions
WHERE id IN ('dealer.read','dealer.write','commerce.read','commerce.map','commerce.reconcile','integrations.ingest','integrations.replay','integrations.admin')
ON CONFLICT DO NOTHING;

CREATE TABLE dealer.dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES partners.partners(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PROSPECT' CHECK (status IN ('PROSPECT','ACTIVE','SUSPENDED','CLOSED')),
  market_countries text[] NOT NULL DEFAULT '{}',
  sales_enabled boolean NOT NULL DEFAULT true,
  service_enabled boolean NOT NULL DEFAULT false,
  default_shipping_address_id uuid REFERENCES partners.addresses(id) ON DELETE RESTRICT,
  default_contact_id uuid REFERENCES partners.contacts(id) ON DELETE RESTRICT,
  default_inventory_location_id uuid REFERENCES warehouse.locations(id) ON DELETE RESTRICT,
  note text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (market_countries <@ ARRAY['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','CH','NO','IS','LI','GB']::text[])
);
CREATE INDEX dealer_status_idx ON dealer.dealers(status, created_at DESC);

CREATE TABLE dealer.status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES dealer.dealers(id) ON DELETE RESTRICT,
  from_status text NOT NULL,
  to_status text NOT NULL,
  dealer_version integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  changed_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dealer_status_history_idx ON dealer.status_history(dealer_id, occurred_at, id);

CREATE TABLE commerce.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('SHOPIFY','OTHER')),
  channel_key text NOT NULL UNIQUE CHECK (length(trim(channel_key)) > 0),
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  external_account_id text NOT NULL CHECK (length(trim(external_account_id)) > 0),
  default_dealer_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  requires_dealer boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_account_id)
);

CREATE TABLE commerce.sku_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES commerce.channels(id) ON DELETE RESTRICT,
  external_variant_id text NOT NULL CHECK (length(trim(external_variant_id)) > 0),
  external_product_id text,
  external_sku text,
  sku_id uuid NOT NULL REFERENCES product.skus(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, external_variant_id)
);
CREATE INDEX commerce_sku_mapping_sku_idx ON commerce.sku_mappings(sku_id, channel_id);

CREATE TABLE commerce.external_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES commerce.channels(id) ON DELETE RESTRICT,
  external_order_id text NOT NULL CHECK (length(trim(external_order_id)) > 0),
  external_order_name text,
  external_customer_id text,
  customer_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  dealer_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
  order_status text NOT NULL DEFAULT 'UNKNOWN',
  financial_status text,
  fulfillment_status text,
  currency char(3) NOT NULL CHECK (currency=upper(currency)),
  subtotal_amount numeric(18,6) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  total_amount numeric(18,6) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  source_created_at timestamptz,
  source_updated_at timestamptz,
  last_provider_event_id text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, external_order_id)
);
CREATE INDEX commerce_external_orders_updated_idx ON commerce.external_orders(channel_id, source_updated_at DESC NULLS LAST, updated_at DESC);

CREATE TABLE commerce.external_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.external_orders(id) ON DELETE RESTRICT,
  external_line_id text NOT NULL CHECK (length(trim(external_line_id)) > 0),
  external_product_id text,
  external_variant_id text,
  external_sku text,
  title text NOT NULL DEFAULT '',
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,6) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  currency char(3) NOT NULL CHECK (currency=upper(currency)),
  sku_id uuid REFERENCES product.skus(id) ON DELETE RESTRICT,
  mapping_source text NOT NULL DEFAULT 'UNMAPPED' CHECK (mapping_source IN ('UNMAPPED','AUTO_VARIANT','MANUAL')),
  source_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, external_line_id)
);
CREATE INDEX commerce_order_lines_mapping_idx ON commerce.external_order_lines(sku_id, order_id);
CREATE INDEX commerce_order_lines_variant_idx ON commerce.external_order_lines(external_variant_id) WHERE external_variant_id IS NOT NULL;

CREATE TABLE commerce.order_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES commerce.external_orders(id) ON DELETE RESTRICT,
  provider_event_id text NOT NULL,
  order_status text NOT NULL,
  financial_status text,
  fulfillment_status text,
  currency char(3) NOT NULL,
  subtotal_amount numeric(18,6) NOT NULL,
  total_amount numeric(18,6) NOT NULL,
  source_updated_at timestamptz,
  normalized_payload jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, provider_event_id)
);
CREATE INDEX commerce_order_snapshots_idx ON commerce.order_snapshots(order_id, captured_at, id);

CREATE TABLE commerce.fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES commerce.channels(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES commerce.external_orders(id) ON DELETE RESTRICT,
  external_fulfillment_id text NOT NULL CHECK (length(trim(external_fulfillment_id)) > 0),
  fulfillment_status text NOT NULL DEFAULT 'UNKNOWN',
  tracking_company text,
  tracking_number text,
  logistics_shipment_id uuid REFERENCES logistics.shipments(id) ON DELETE RESTRICT,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  last_provider_event_id text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, external_fulfillment_id)
);
CREATE INDEX commerce_fulfillment_order_idx ON commerce.fulfillments(order_id, updated_at DESC);

CREATE TABLE commerce.fulfillment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id uuid NOT NULL REFERENCES commerce.fulfillments(id) ON DELETE RESTRICT,
  order_line_id uuid NOT NULL REFERENCES commerce.external_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(18,6) NOT NULL CHECK (quantity > 0),
  UNIQUE (fulfillment_id, order_line_id)
);

CREATE TABLE commerce.mapping_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES commerce.channels(id) ON DELETE RESTRICT,
  exception_type text NOT NULL CHECK (exception_type IN ('UNKNOWN_VARIANT','MISSING_DEALER','MISSING_CUSTOMER','CONFLICT')),
  entity_type text NOT NULL CHECK (entity_type IN ('ORDER','ORDER_LINE','FULFILLMENT')),
  entity_id uuid NOT NULL,
  external_reference text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','IGNORED')),
  resolution jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES identity.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX commerce_open_exception_uq ON commerce.mapping_exceptions(channel_id, exception_type, entity_type, entity_id) WHERE status='OPEN';
CREATE INDEX commerce_exception_queue_idx ON commerce.mapping_exceptions(status, created_at DESC);

CREATE TABLE commerce.exception_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id uuid NOT NULL REFERENCES commerce.mapping_exceptions(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('OPENED','RESOLVED','IGNORED','REOPENED')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commerce_exception_events_idx ON commerce.exception_events(exception_id, occurred_at, id);

CREATE TABLE integrations.webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES commerce.channels(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  topic text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  provider_occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, provider_event_id),
  UNIQUE (channel_id, payload_sha256)
);
CREATE INDEX integrations_webhook_topic_idx ON integrations.webhook_receipts(channel_id, topic, received_at DESC);

CREATE TABLE integrations.ingestion_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES integrations.webhook_receipts(id) ON DELETE RESTRICT,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  outcome text NOT NULL CHECK (outcome IN ('PROCESSED','REJECTED','NOOP')),
  normalized_entity_type text,
  normalized_entity_id uuid,
  error_code text,
  message text NOT NULL DEFAULT '',
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (receipt_id, attempt_number)
);
CREATE INDEX integrations_ingestion_attempt_idx ON integrations.ingestion_attempts(receipt_id, attempt_number DESC);

CREATE TABLE integrations.sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES commerce.channels(id) ON DELETE RESTRICT,
  cursor_key text NOT NULL,
  cursor_value text NOT NULL,
  source_updated_at timestamptz,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, cursor_key)
);

CREATE OR REPLACE FUNCTION dealer.validate_profile() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE address_partner uuid; contact_partner uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners.roles WHERE partner_id=NEW.partner_id AND role='DEALER' AND enabled=true) THEN
    RAISE EXCEPTION 'Dealer profile requires enabled DEALER Partner role';
  END IF;
  IF NEW.default_shipping_address_id IS NOT NULL THEN
    SELECT partner_id INTO address_partner FROM partners.addresses WHERE id=NEW.default_shipping_address_id;
    IF address_partner IS DISTINCT FROM NEW.partner_id THEN RAISE EXCEPTION 'Dealer default address must belong to Dealer Partner'; END IF;
  END IF;
  IF NEW.default_contact_id IS NOT NULL THEN
    SELECT partner_id INTO contact_partner FROM partners.contacts WHERE id=NEW.default_contact_id;
    IF contact_partner IS DISTINCT FROM NEW.partner_id THEN RAISE EXCEPTION 'Dealer default contact must belong to Dealer Partner'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dealer_profile_guard BEFORE INSERT OR UPDATE OF partner_id,default_shipping_address_id,default_contact_id ON dealer.dealers FOR EACH ROW EXECUTE FUNCTION dealer.validate_profile();

CREATE OR REPLACE FUNCTION dealer.capture_status() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status<>OLD.status THEN
    INSERT INTO dealer.status_history(dealer_id,from_status,to_status,dealer_version,reason,changed_by)
    VALUES (NEW.id,OLD.status,NEW.status,NEW.version,'',NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dealer_status_history AFTER UPDATE OF status ON dealer.dealers FOR EACH ROW EXECUTE FUNCTION dealer.capture_status();

CREATE OR REPLACE FUNCTION commerce.validate_dealer_partner(p_partner_id uuid,p_message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_partner_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM partners.roles WHERE partner_id=p_partner_id AND role='DEALER' AND enabled=true) THEN RAISE EXCEPTION '%',p_message; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commerce.validate_customer_partner(p_partner_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_partner_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM partners.roles WHERE partner_id=p_partner_id AND role='CUSTOMER' AND enabled=true) THEN RAISE EXCEPTION 'Order customer mapping requires enabled CUSTOMER Partner role'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION commerce.validate_channel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM commerce.validate_dealer_partner(NEW.default_dealer_partner_id,'Channel default Dealer must have enabled DEALER Partner role');
  IF NEW.requires_dealer AND NEW.default_dealer_partner_id IS NULL THEN RAISE EXCEPTION 'Dealer-required channel must define a default Dealer'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_channel_guard BEFORE INSERT OR UPDATE OF default_dealer_partner_id,requires_dealer ON commerce.channels FOR EACH ROW EXECUTE FUNCTION commerce.validate_channel();

CREATE OR REPLACE FUNCTION commerce.validate_order_partners() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM commerce.validate_dealer_partner(NEW.dealer_partner_id,'Order Dealer mapping requires enabled DEALER Partner role');
  PERFORM commerce.validate_customer_partner(NEW.customer_partner_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_order_partner_guard BEFORE INSERT OR UPDATE OF dealer_partner_id,customer_partner_id ON commerce.external_orders FOR EACH ROW EXECUTE FUNCTION commerce.validate_order_partners();

CREATE OR REPLACE FUNCTION commerce.validate_fulfillment() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE order_channel uuid;
BEGIN
  SELECT channel_id INTO order_channel FROM commerce.external_orders WHERE id=NEW.order_id;
  IF order_channel IS DISTINCT FROM NEW.channel_id THEN RAISE EXCEPTION 'Fulfillment channel must match order channel'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_fulfillment_guard BEFORE INSERT OR UPDATE OF channel_id,order_id ON commerce.fulfillments FOR EACH ROW EXECUTE FUNCTION commerce.validate_fulfillment();

CREATE OR REPLACE FUNCTION commerce.validate_fulfillment_line() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE fulfillment_order uuid; line_order uuid;
BEGIN
  SELECT order_id INTO fulfillment_order FROM commerce.fulfillments WHERE id=NEW.fulfillment_id;
  SELECT order_id INTO line_order FROM commerce.external_order_lines WHERE id=NEW.order_line_id;
  IF fulfillment_order IS DISTINCT FROM line_order THEN RAISE EXCEPTION 'Fulfillment line must reference a line from the same order'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_fulfillment_line_guard BEFORE INSERT OR UPDATE OF fulfillment_id,order_line_id ON commerce.fulfillment_lines FOR EACH ROW EXECUTE FUNCTION commerce.validate_fulfillment_line();

CREATE OR REPLACE FUNCTION commerce.reject_evidence_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Commerce evidence is append-only';
END;
$$;
CREATE TRIGGER commerce_order_snapshot_no_mutation BEFORE UPDATE OR DELETE ON commerce.order_snapshots FOR EACH ROW EXECUTE FUNCTION commerce.reject_evidence_mutation();
CREATE TRIGGER commerce_exception_events_no_mutation BEFORE UPDATE OR DELETE ON commerce.exception_events FOR EACH ROW EXECUTE FUNCTION commerce.reject_evidence_mutation();
CREATE TRIGGER integrations_webhook_receipt_no_mutation BEFORE UPDATE OR DELETE ON integrations.webhook_receipts FOR EACH ROW EXECUTE FUNCTION commerce.reject_evidence_mutation();
CREATE TRIGGER integrations_attempt_no_mutation BEFORE UPDATE OR DELETE ON integrations.ingestion_attempts FOR EACH ROW EXECUTE FUNCTION commerce.reject_evidence_mutation();

CREATE OR REPLACE FUNCTION commerce.seed_exception_event() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO commerce.exception_events(exception_id,event_type,metadata) VALUES (NEW.id,'OPENED','{}'::jsonb);
  RETURN NEW;
END;
$$;
CREATE TRIGGER commerce_exception_seed AFTER INSERT ON commerce.mapping_exceptions FOR EACH ROW EXECUTE FUNCTION commerce.seed_exception_event();
