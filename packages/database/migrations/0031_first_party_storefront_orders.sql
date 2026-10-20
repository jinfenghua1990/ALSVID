-- First-party ALSVID WWW order drafts and immutable price snapshots.
-- This migration deliberately does not enable public checkout or provide a way
-- to mark orders paid. Only a future verified PSP adapter may insert payment evidence.
INSERT INTO identity.permissions(id,description) VALUES
 ('commerce.storefront.read','Read ALSVID first-party storefront order drafts and price book'),
 ('commerce.storefront.write','Create and cancel internal ALSVID storefront order drafts'),
 ('commerce.price.manage','Create, activate and retire ALSVID storefront price revisions')
ON CONFLICT(id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('commerce_manager','commerce.storefront.read'),
 ('commerce_manager','commerce.storefront.write'),
 ('commerce_manager','commerce.price.manage'),
 ('commerce_viewer','commerce.storefront.read'),
 ('system_admin','commerce.storefront.read'),
 ('system_admin','commerce.storefront.write'),
 ('system_admin','commerce.price.manage')
ON CONFLICT DO NOTHING;

CREATE SEQUENCE commerce.storefront_order_number_seq START 1;

CREATE TABLE commerce.storefront_prices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sku_id uuid NOT NULL REFERENCES product.skus(id) ON DELETE RESTRICT,
 market_country char(2) NOT NULL CHECK(market_country IN ('DE','AT')),
 currency char(3) NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
 unit_price_gross numeric(18,2) NOT NULL CHECK(unit_price_gross>0),
 tax_rate_basis_points integer NOT NULL CHECK(tax_rate_basis_points BETWEEN 0 AND 10000),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','RETIRED')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 effective_from timestamptz,
 retired_at timestamptz,
 created_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status='DRAFT' AND effective_from IS NULL AND retired_at IS NULL)
    OR (status='ACTIVE' AND effective_from IS NOT NULL AND retired_at IS NULL)
    OR (status='RETIRED' AND effective_from IS NOT NULL AND retired_at IS NOT NULL))
);
CREATE UNIQUE INDEX storefront_one_active_price_per_sku_market
 ON commerce.storefront_prices(sku_id,market_country,currency) WHERE status='ACTIVE';
CREATE INDEX storefront_prices_market_idx
 ON commerce.storefront_prices(market_country,status,created_at DESC);
CREATE INDEX storefront_prices_sku_idx
 ON commerce.storefront_prices(sku_id,status,created_at DESC);

CREATE OR REPLACE FUNCTION commerce.guard_storefront_price_revision() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE sku_status text;
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'Storefront price revisions cannot be deleted; retire them instead';
 END IF;
 IF ROW(NEW.sku_id,NEW.market_country,NEW.currency,NEW.unit_price_gross,NEW.tax_rate_basis_points,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM
    ROW(OLD.sku_id,OLD.market_country,OLD.currency,OLD.unit_price_gross,OLD.tax_rate_basis_points,OLD.created_by,OLD.created_at) THEN
  RAISE EXCEPTION 'Storefront price amounts and identity are immutable; create a new revision';
 END IF;
 IF OLD.status='DRAFT' AND NEW.status='ACTIVE' THEN
  SELECT status INTO sku_status FROM product.skus WHERE id=NEW.sku_id;
  IF sku_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Only active SKUs may have an active storefront price'; END IF;
  IF NEW.effective_from IS NULL OR NEW.retired_at IS NOT NULL OR NEW.version<>OLD.version+1 THEN
   RAISE EXCEPTION 'Invalid price activation metadata';
  END IF;
 ELSIF OLD.status='ACTIVE' AND NEW.status='RETIRED' THEN
  IF NEW.effective_from IS DISTINCT FROM OLD.effective_from OR NEW.retired_at IS NULL OR NEW.version<>OLD.version+1 THEN
   RAISE EXCEPTION 'Invalid price retirement metadata';
  END IF;
 ELSE
  RAISE EXCEPTION 'Invalid storefront price transition: % -> %',OLD.status,NEW.status;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER storefront_price_revision_guard
 BEFORE UPDATE OR DELETE ON commerce.storefront_prices
 FOR EACH ROW EXECUTE FUNCTION commerce.guard_storefront_price_revision();

CREATE TABLE commerce.storefront_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_number text NOT NULL UNIQUE DEFAULT ('ALS-ORD-'||lpad(nextval('commerce.storefront_order_number_seq')::text,8,'0')),
 source text NOT NULL DEFAULT 'ALSVID_WWW' CHECK(source='ALSVID_WWW'),
 customer_email text NOT NULL CHECK(length(trim(customer_email)) BETWEEN 5 AND 254),
 market_country char(2) NOT NULL CHECK(market_country IN ('DE','AT')),
 currency char(3) NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','AWAITING_PAYMENT','PAYMENT_PENDING','PAYMENT_VERIFIED','FULFILLMENT_PENDING','IN_PRODUCTION','FULFILLED','CLOSED','CANCELLED')),
 payment_status text NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK(payment_status IN ('NOT_CONFIGURED','PENDING','VERIFIED','FAILED','UNKNOWN')),
 tax_configuration_status text NOT NULL DEFAULT 'ADMIN_CONFIGURED_UNVERIFIED' CHECK(tax_configuration_status='ADMIN_CONFIGURED_UNVERIFIED'),
 total_net_amount numeric(18,2) NOT NULL CHECK(total_net_amount>=0),
 total_tax_amount numeric(18,2) NOT NULL CHECK(total_tax_amount>=0),
 total_gross_amount numeric(18,2) NOT NULL CHECK(total_gross_amount>0),
 client_request_id uuid NOT NULL,
 request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[0-9a-f]{64}$'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 cancelled_at timestamptz,
 cancel_reason text,
 created_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(created_by,client_request_id),
 CHECK(total_net_amount+total_tax_amount=total_gross_amount),
 CHECK((status='DRAFT' AND payment_status='NOT_CONFIGURED')
    OR (status='AWAITING_PAYMENT' AND payment_status IN ('PENDING','FAILED','UNKNOWN'))
    OR (status='PAYMENT_PENDING' AND payment_status IN ('PENDING','UNKNOWN','FAILED'))
    OR (status IN ('PAYMENT_VERIFIED','FULFILLMENT_PENDING','IN_PRODUCTION','FULFILLED','CLOSED') AND payment_status='VERIFIED')
    OR status='CANCELLED'),
 CHECK((status='CANCELLED' AND cancelled_at IS NOT NULL AND length(trim(cancel_reason))>=10)
    OR (status<>'CANCELLED' AND cancelled_at IS NULL AND cancel_reason IS NULL))
);
CREATE INDEX storefront_orders_status_idx ON commerce.storefront_orders(status,created_at DESC);
CREATE INDEX storefront_orders_customer_idx ON commerce.storefront_orders(lower(customer_email),created_at DESC);

CREATE TABLE commerce.storefront_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES commerce.storefront_orders(id) ON DELETE RESTRICT,
 price_id uuid NOT NULL REFERENCES commerce.storefront_prices(id) ON DELETE RESTRICT,
 sku_id uuid NOT NULL REFERENCES product.skus(id) ON DELETE RESTRICT,
 sku_code_snapshot text NOT NULL,
 sku_name_snapshot text NOT NULL,
 color_code_snapshot text,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000),
 currency char(3) NOT NULL CHECK(currency='EUR'),
 unit_price_gross numeric(18,2) NOT NULL CHECK(unit_price_gross>0),
 tax_rate_basis_points integer NOT NULL CHECK(tax_rate_basis_points BETWEEN 0 AND 10000),
 line_net_amount numeric(18,2) NOT NULL CHECK(line_net_amount>=0),
 line_tax_amount numeric(18,2) NOT NULL CHECK(line_tax_amount>=0),
 line_gross_amount numeric(18,2) NOT NULL CHECK(line_gross_amount>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,sku_id),
 CHECK(line_net_amount+line_tax_amount=line_gross_amount),
 CHECK(line_gross_amount=unit_price_gross*quantity)
);
CREATE INDEX storefront_order_lines_order_idx ON commerce.storefront_order_lines(order_id,created_at,id);

CREATE TABLE commerce.storefront_order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES commerce.storefront_orders(id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK(event_type IN ('ORDER_CREATED','STATUS_CHANGED','PAYMENT_STATUS_CHANGED')),
 from_status text,
 to_status text NOT NULL,
 from_payment_status text,
 to_payment_status text NOT NULL,
 actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX storefront_order_events_idx ON commerce.storefront_order_events(order_id,occurred_at,id);

CREATE TABLE commerce.storefront_payment_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES commerce.storefront_orders(id) ON DELETE RESTRICT,
 provider text NOT NULL CHECK(provider=upper(provider) AND length(trim(provider)) BETWEEN 2 AND 40),
 provider_transaction_id text NOT NULL CHECK(length(trim(provider_transaction_id)) BETWEEN 1 AND 200),
 amount numeric(18,2) NOT NULL CHECK(amount>0),
 currency char(3) NOT NULL CHECK(currency='EUR'),
 provider_status text NOT NULL CHECK(provider_status='SUCCEEDED'),
 signature_verified_at timestamptz NOT NULL,
 order_binding_verified_at timestamptz NOT NULL,
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[0-9a-f]{64}$'),
 verified_at timestamptz NOT NULL DEFAULT now(),
 recorded_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 UNIQUE(provider,provider_transaction_id)
);
CREATE INDEX storefront_payment_verifications_order_idx ON commerce.storefront_payment_verifications(order_id,verified_at DESC);

CREATE OR REPLACE FUNCTION commerce.reject_storefront_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Storefront order lines, payment verification evidence and event history are immutable'; END;
$$;
CREATE TRIGGER storefront_order_lines_immutable BEFORE UPDATE OR DELETE ON commerce.storefront_order_lines
 FOR EACH ROW EXECUTE FUNCTION commerce.reject_storefront_history_mutation();
CREATE TRIGGER storefront_order_events_immutable BEFORE UPDATE OR DELETE ON commerce.storefront_order_events
 FOR EACH ROW EXECUTE FUNCTION commerce.reject_storefront_history_mutation();
CREATE TRIGGER storefront_payment_verifications_immutable BEFORE UPDATE OR DELETE ON commerce.storefront_payment_verifications
 FOR EACH ROW EXECUTE FUNCTION commerce.reject_storefront_history_mutation();

CREATE OR REPLACE FUNCTION commerce.guard_storefront_order_state() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE has_verified_evidence boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'DRAFT' OR NEW.payment_status<>'NOT_CONFIGURED' THEN
   RAISE EXCEPTION 'First-party storefront orders must start as unpaid drafts';
  END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.order_number,NEW.source,NEW.customer_email,NEW.market_country,NEW.currency,
        NEW.tax_configuration_status,NEW.total_net_amount,NEW.total_tax_amount,NEW.total_gross_amount,
        NEW.client_request_id,NEW.request_sha256,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM
    ROW(OLD.order_number,OLD.source,OLD.customer_email,OLD.market_country,OLD.currency,
        OLD.tax_configuration_status,OLD.total_net_amount,OLD.total_tax_amount,OLD.total_gross_amount,
        OLD.client_request_id,OLD.request_sha256,OLD.created_by,OLD.created_at) THEN
  RAISE EXCEPTION 'Storefront order identity and financial snapshots are immutable';
 END IF;
 IF NEW.status=OLD.status AND NEW.payment_status=OLD.payment_status THEN
  RAISE EXCEPTION 'Storefront order requires an explicit valid state transition';
 END IF;
 IF NEW.version<>OLD.version+1 THEN RAISE EXCEPTION 'Storefront order version must increment exactly once'; END IF;
 IF OLD.status='DRAFT' AND NEW.status='CANCELLED' AND OLD.payment_status='NOT_CONFIGURED'
    AND NEW.payment_status='NOT_CONFIGURED' THEN
  IF NEW.cancelled_at IS NULL OR length(trim(NEW.cancel_reason))<10 THEN RAISE EXCEPTION 'Cancellation requires timestamp and reason'; END IF;
 ELSIF OLD.status='PAYMENT_PENDING' AND NEW.status='PAYMENT_VERIFIED' AND NEW.payment_status='VERIFIED' THEN
  SELECT EXISTS(SELECT 1 FROM commerce.storefront_payment_verifications v
   WHERE v.order_id=NEW.id AND v.amount=NEW.total_gross_amount AND v.currency=NEW.currency
    AND v.provider_status='SUCCEEDED' AND v.signature_verified_at IS NOT NULL AND v.order_binding_verified_at IS NOT NULL)
   INTO has_verified_evidence;
  IF NOT has_verified_evidence THEN RAISE EXCEPTION 'Payment verification evidence is required before marking order paid'; END IF;
 ELSIF OLD.status='PAYMENT_VERIFIED' AND NEW.status='FULFILLMENT_PENDING' AND NEW.payment_status='VERIFIED' THEN
  SELECT EXISTS(SELECT 1 FROM commerce.storefront_payment_verifications v
   WHERE v.order_id=NEW.id AND v.amount=NEW.total_gross_amount AND v.currency=NEW.currency)
   INTO has_verified_evidence;
  IF NOT has_verified_evidence THEN RAISE EXCEPTION 'Verified payment evidence is required before fulfillment'; END IF;
 ELSIF OLD.status='FULFILLMENT_PENDING' AND NEW.status='IN_PRODUCTION' AND NEW.payment_status='VERIFIED' THEN
  IF EXISTS(SELECT 1 FROM commerce.storefront_order_lines l
    WHERE l.order_id=NEW.id AND NOT EXISTS(
     SELECT 1 FROM production.production_orders po
     WHERE po.source_storefront_order_line_id=l.id AND po.status IN ('RELEASED','IN_PROGRESS','QC_PENDING','COMPLETED')))
  THEN RAISE EXCEPTION 'Every storefront order line needs an authorized linked production order before entering production'; END IF;
 ELSIF OLD.status='IN_PRODUCTION' AND NEW.status='FULFILLED' AND NEW.payment_status='VERIFIED' THEN
  IF EXISTS(SELECT 1 FROM commerce.storefront_order_lines l
    WHERE l.order_id=NEW.id AND NOT EXISTS(
     SELECT 1 FROM production.production_orders po
     WHERE po.source_storefront_order_line_id=l.id AND po.status='COMPLETED'))
  THEN RAISE EXCEPTION 'All linked production orders must complete before storefront order fulfillment'; END IF;
 ELSIF OLD.status='FULFILLED' AND NEW.status='CLOSED' AND NEW.payment_status='VERIFIED' THEN
  NULL;
 ELSE
  RAISE EXCEPTION 'Invalid storefront order transition: %/% -> %/%',
    OLD.status,OLD.payment_status,NEW.status,NEW.payment_status;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER storefront_order_state_guard BEFORE INSERT OR UPDATE ON commerce.storefront_orders
 FOR EACH ROW EXECUTE FUNCTION commerce.guard_storefront_order_state();

CREATE OR REPLACE FUNCTION commerce.guard_storefront_payment_verification() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE order_row commerce.storefront_orders%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Payment verification evidence is append-only'; END IF;
 SELECT * INTO order_row FROM commerce.storefront_orders WHERE id=NEW.order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storefront order does not exist'; END IF;
 IF order_row.status<>'PAYMENT_PENDING' OR order_row.payment_status NOT IN ('PENDING','UNKNOWN') THEN
  RAISE EXCEPTION 'Only a pending payment attempt may be verified';
 END IF;
 IF NEW.amount<>order_row.total_gross_amount OR NEW.currency<>order_row.currency THEN
  RAISE EXCEPTION 'Verified PSP amount and currency must match the immutable order total';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER storefront_payment_verification_guard BEFORE INSERT OR UPDATE OR DELETE ON commerce.storefront_payment_verifications
 FOR EACH ROW EXECUTE FUNCTION commerce.guard_storefront_payment_verification();

CREATE OR REPLACE FUNCTION commerce.record_storefront_order_event() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO commerce.storefront_order_events(order_id,event_type,to_status,to_payment_status,actor_user_id,metadata)
  VALUES(NEW.id,'ORDER_CREATED',NEW.status,NEW.payment_status,NEW.created_by,
   jsonb_build_object('orderNumber',NEW.order_number,'currency',NEW.currency,'totalGrossAmount',NEW.total_gross_amount));
 ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
  INSERT INTO commerce.storefront_order_events(order_id,event_type,from_status,to_status,from_payment_status,to_payment_status,actor_user_id,metadata)
  VALUES(NEW.id,CASE WHEN NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN 'PAYMENT_STATUS_CHANGED' ELSE 'STATUS_CHANGED' END,
   OLD.status,NEW.status,OLD.payment_status,NEW.payment_status,NEW.updated_by,
   jsonb_build_object('version',NEW.version,'reason',NEW.cancel_reason));
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER storefront_order_event_recorder AFTER INSERT OR UPDATE ON commerce.storefront_orders
 FOR EACH ROW EXECUTE FUNCTION commerce.record_storefront_order_event();

-- A production order linked to a first-party sales line is allowed only after
-- a signed, transaction-bound PSP success was recorded and exactly matched.
-- Existing manually planned production orders without a storefront source remain unchanged.
ALTER TABLE production.production_orders
 ADD COLUMN source_storefront_order_line_id uuid UNIQUE
 REFERENCES commerce.storefront_order_lines(id) ON DELETE RESTRICT;
CREATE INDEX production_storefront_source_idx ON production.production_orders(source_storefront_order_line_id)
 WHERE source_storefront_order_line_id IS NOT NULL;

CREATE OR REPLACE FUNCTION production.guard_storefront_order_link() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
 order_row commerce.storefront_orders%ROWTYPE;
 line_row commerce.storefront_order_lines%ROWTYPE;
 spec_sku_id uuid;
BEGIN
 IF TG_OP='UPDATE' AND OLD.source_storefront_order_line_id IS NOT NULL
    AND NEW.source_storefront_order_line_id IS DISTINCT FROM OLD.source_storefront_order_line_id THEN
  RAISE EXCEPTION 'Production order storefront source is immutable';
 END IF;
 IF NEW.source_storefront_order_line_id IS NULL THEN RETURN NEW; END IF;
 SELECT l.* INTO line_row FROM commerce.storefront_order_lines l WHERE l.id=NEW.source_storefront_order_line_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storefront order line not found'; END IF;
 SELECT o.* INTO order_row FROM commerce.storefront_orders o WHERE o.id=line_row.order_id FOR UPDATE;
 IF order_row.status NOT IN ('PAYMENT_VERIFIED','FULFILLMENT_PENDING','IN_PRODUCTION')
    OR order_row.payment_status<>'VERIFIED' THEN
  RAISE EXCEPTION 'Production demand requires a payment-verified first-party order';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM commerce.storefront_payment_verifications v
   WHERE v.order_id=order_row.id AND v.amount=order_row.total_gross_amount
    AND v.currency=order_row.currency AND v.provider_status='SUCCEEDED'
    AND v.signature_verified_at IS NOT NULL AND v.order_binding_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Verified PSP evidence matching the order total is required for production demand';
 END IF;
 IF NEW.planned_quantity<>line_row.quantity THEN
  RAISE EXCEPTION 'Production quantity must match the immutable storefront order line quantity';
 END IF;
 SELECT sku_id INTO spec_sku_id FROM engineering.build_specs WHERE id=NEW.build_spec_id AND status='RELEASED';
 IF spec_sku_id IS NULL OR spec_sku_id<>line_row.sku_id THEN
  RAISE EXCEPTION 'Production demand requires a released Build Specification matching the ordered SKU';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER production_storefront_order_link_guard
 BEFORE INSERT OR UPDATE OF source_storefront_order_line_id,build_spec_id,planned_quantity
 ON production.production_orders
 FOR EACH ROW EXECUTE FUNCTION production.guard_storefront_order_link();

-- Database-side checks ensure the app cannot forge price snapshots or totals.
CREATE OR REPLACE FUNCTION commerce.guard_storefront_order_line_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
 order_row commerce.storefront_orders%ROWTYPE;
 price_row commerce.storefront_prices%ROWTYPE;
 sku_row product.skus%ROWTYPE;
 expected_tax numeric(18,2);
BEGIN
 SELECT * INTO order_row FROM commerce.storefront_orders WHERE id=NEW.order_id FOR UPDATE;
 IF NOT FOUND OR order_row.status<>'DRAFT' OR order_row.payment_status<>'NOT_CONFIGURED' THEN
  RAISE EXCEPTION 'Order lines may only be added while creating an unpaid internal draft';
 END IF;
 SELECT p.* INTO price_row FROM commerce.storefront_prices p WHERE p.id=NEW.price_id FOR SHARE;
 IF NOT FOUND OR price_row.status<>'ACTIVE' OR price_row.effective_from IS NULL OR price_row.effective_from>now()
   OR price_row.sku_id<>NEW.sku_id OR price_row.market_country<>order_row.market_country
   OR price_row.currency<>order_row.currency OR price_row.unit_price_gross<>NEW.unit_price_gross
   OR price_row.tax_rate_basis_points<>NEW.tax_rate_basis_points THEN
  RAISE EXCEPTION 'Order line price snapshot must match an active server-owned price for this SKU and market';
 END IF;
 SELECT * INTO sku_row FROM product.skus WHERE id=NEW.sku_id FOR SHARE;
 IF NOT FOUND OR sku_row.status<>'ACTIVE' OR sku_row.sku<>NEW.sku_code_snapshot
   OR sku_row.name<>NEW.sku_name_snapshot OR sku_row.color_code IS DISTINCT FROM NEW.color_code_snapshot THEN
  RAISE EXCEPTION 'Order line product snapshot must match the current active SKU';
 END IF;
 expected_tax:=round((NEW.line_gross_amount*NEW.tax_rate_basis_points::numeric)/(10000+NEW.tax_rate_basis_points),2);
 IF NEW.line_gross_amount<>NEW.unit_price_gross*NEW.quantity
   OR NEW.line_tax_amount<>expected_tax OR NEW.line_net_amount<>NEW.line_gross_amount-expected_tax THEN
  RAISE EXCEPTION 'Order line gross, net and tax amounts do not reconcile';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER storefront_order_line_snapshot_guard
 BEFORE INSERT ON commerce.storefront_order_lines
 FOR EACH ROW EXECUTE FUNCTION commerce.guard_storefront_order_line_insert();

CREATE OR REPLACE FUNCTION commerce.verify_storefront_order_totals() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
 target_order_id uuid;
 order_row commerce.storefront_orders%ROWTYPE;
 line_count bigint;
 line_net numeric(18,2);
 line_tax numeric(18,2);
 line_gross numeric(18,2);
BEGIN
 IF TG_TABLE_NAME='storefront_orders' THEN target_order_id:=NEW.id;
 ELSE target_order_id:=NEW.order_id;
 END IF;
 SELECT * INTO order_row FROM commerce.storefront_orders WHERE id=target_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Storefront order was removed unexpectedly'; END IF;
 SELECT count(*),COALESCE(sum(line_net_amount),0),COALESCE(sum(line_tax_amount),0),COALESCE(sum(line_gross_amount),0)
 INTO line_count,line_net,line_tax,line_gross
 FROM commerce.storefront_order_lines WHERE order_id=target_order_id;
 IF line_count<1 OR line_net<>order_row.total_net_amount OR line_tax<>order_row.total_tax_amount
   OR line_gross<>order_row.total_gross_amount THEN
  RAISE EXCEPTION 'Storefront order totals must exactly equal the immutable line snapshots';
 END IF;
 RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER storefront_order_totals_match_order
 AFTER INSERT ON commerce.storefront_orders DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION commerce.verify_storefront_order_totals();
CREATE CONSTRAINT TRIGGER storefront_order_totals_match_lines
 AFTER INSERT ON commerce.storefront_order_lines DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION commerce.verify_storefront_order_totals();
