-- Storefront order submission: closes the unreachable entry into the payment branch.
--
-- 0031 defined nine statuses and a strict transition guard, but no edge ever left
-- DRAFT except cancellation, so AWAITING_PAYMENT, PAYMENT_PENDING and everything
-- downstream were unreachable and storefront_payment_verifications could never be
-- populated. This migration adds SUBMITTED as the honest "customer confirmed,
-- awaiting a payment channel" state. It deliberately does NOT add the edge into
-- AWAITING_PAYMENT: that state implies a payment attempt exists at a provider and
-- must only be entered by a future verified PSP adapter, per ADR 0005.
--
-- No payment fact is invented here. payment_status stays NOT_CONFIGURED.

-- The original status CHECK and the status/payment_status pairing CHECK were both
-- declared inline, so their generated names are not stable across environments.
-- Find them by definition instead of guessing.
DO $$
DECLARE constraint_name text;
BEGIN
 FOR constraint_name IN
  SELECT conname FROM pg_constraint
   WHERE conrelid='commerce.storefront_orders'::regclass
     AND contype='c'
     AND pg_get_constraintdef(oid) LIKE '%AWAITING_PAYMENT%'
 LOOP
  EXECUTE format('ALTER TABLE commerce.storefront_orders DROP CONSTRAINT %I',constraint_name);
 END LOOP;
END;
$$;

ALTER TABLE commerce.storefront_orders
 ADD CONSTRAINT storefront_orders_status_check
 CHECK(status IN ('DRAFT','SUBMITTED','AWAITING_PAYMENT','PAYMENT_PENDING','PAYMENT_VERIFIED',
   'FULFILLMENT_PENDING','IN_PRODUCTION','FULFILLED','CLOSED','CANCELLED'));

ALTER TABLE commerce.storefront_orders
 ADD CONSTRAINT storefront_orders_payment_pairing_check
 CHECK((status IN ('DRAFT','SUBMITTED') AND payment_status='NOT_CONFIGURED')
    OR (status='AWAITING_PAYMENT' AND payment_status IN ('PENDING','FAILED','UNKNOWN'))
    OR (status='PAYMENT_PENDING' AND payment_status IN ('PENDING','UNKNOWN','FAILED'))
    OR (status IN ('PAYMENT_VERIFIED','FULFILLMENT_PENDING','IN_PRODUCTION','FULFILLED','CLOSED')
        AND payment_status='VERIFIED')
    OR status='CANCELLED');

CREATE OR REPLACE FUNCTION commerce.guard_storefront_order_state() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE has_verified_evidence boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'DRAFT' OR NEW.payment_status<>'NOT_CONFIGURED' OR NEW.tax_configuration_status<>'ADMIN_CONFIGURED_UNVERIFIED' THEN
   RAISE EXCEPTION 'First-party storefront orders must start as unpaid drafts with unverified tax configuration';
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
 IF OLD.status='DRAFT' AND NEW.status='SUBMITTED' AND NEW.payment_status='NOT_CONFIGURED' THEN
  IF NEW.cancelled_at IS NOT NULL OR NEW.cancel_reason IS NOT NULL THEN
   RAISE EXCEPTION 'Submission must not carry cancellation metadata';
  END IF;
 ELSIF OLD.status IN ('DRAFT','SUBMITTED') AND NEW.status='CANCELLED'
    AND OLD.payment_status='NOT_CONFIGURED' AND NEW.payment_status='NOT_CONFIGURED' THEN
  IF NEW.cancelled_at IS NULL OR length(trim(NEW.cancel_reason))<10 THEN RAISE EXCEPTION 'Cancellation requires timestamp and reason'; END IF;
 ELSIF OLD.status='PAYMENT_PENDING' AND NEW.status='PAYMENT_VERIFIED' AND NEW.payment_status='VERIFIED' THEN
  SELECT EXISTS(SELECT 1 FROM commerce.storefront_payment_verifications v
   WHERE v.order_id=NEW.id AND v.amount=NEW.total_gross_amount AND v.currency=NEW.currency
    AND v.provider_status='SUCCEEDED' AND v.signature_verified_at IS NOT NULL AND v.order_binding_verified_at IS NOT NULL)
   INTO has_verified_evidence;
  IF NOT has_verified_evidence OR NEW.tax_configuration_status<>'VERIFIED' THEN RAISE EXCEPTION 'Verified PSP evidence and approved tax configuration are required before marking order paid'; END IF;
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

INSERT INTO identity.permissions(id,description) VALUES
 ('commerce.storefront.submit','Submit an internal ALSVID storefront order draft for payment')
ON CONFLICT(id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('commerce_manager','commerce.storefront.submit'),
 ('system_admin','commerce.storefront.submit')
ON CONFLICT DO NOTHING;
