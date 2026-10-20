-- First-stage internal operations only: a review request is NOT a PSP refund.
-- Existing Commerce external orders remain provider-owned and must not be
-- reclassified as first-party checkout orders or payment-confirmed facts.
INSERT INTO identity.permissions(id,description) VALUES
 ('commerce.refund.review','Request internal refund review for imported external orders')
ON CONFLICT(id) DO NOTHING;
INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('commerce_manager','commerce.refund.review'),
 ('system_admin','commerce.refund.review')
ON CONFLICT DO NOTHING;

CREATE TABLE commerce.refund_review_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 external_order_id uuid NOT NULL REFERENCES commerce.external_orders(id) ON DELETE RESTRICT,
 client_request_id uuid NOT NULL,
 requested_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 requested_amount numeric(18,6) NOT NULL CHECK(requested_amount>0),
 currency char(3) NOT NULL CHECK(currency=upper(currency) AND currency ~ '^[A-Z]{3}$'),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 1000),
 state text NOT NULL DEFAULT 'REVIEW_REQUESTED' CHECK(state='REVIEW_REQUESTED'),
 requested_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(requested_by,client_request_id)
);
CREATE INDEX commerce_refund_review_order_idx
 ON commerce.refund_review_requests(external_order_id,requested_at DESC);
CREATE OR REPLACE FUNCTION commerce.reject_refund_review_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Refund review requests are immutable; PSP refund execution needs an independently authorized workflow';
END;
$$;
CREATE TRIGGER commerce_refund_review_immutable
 BEFORE UPDATE OR DELETE ON commerce.refund_review_requests
 FOR EACH ROW EXECUTE FUNCTION commerce.reject_refund_review_change();
