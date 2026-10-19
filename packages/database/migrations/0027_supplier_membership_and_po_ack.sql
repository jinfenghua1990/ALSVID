-- Supplier identities are explicitly bound to one upstream Partner; never infer organization from email.
CREATE TABLE identity.supplier_memberships (
 user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED')),
 evidence_ref text NOT NULL CHECK(length(trim(evidence_ref)) BETWEEN 8 AND 200),
 approved_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,partner_id)
);
CREATE INDEX supplier_memberships_partner_idx ON identity.supplier_memberships(partner_id,user_id) WHERE status='ACTIVE';
CREATE OR REPLACE FUNCTION identity.require_upstream_partner_member() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM partners.roles r
  WHERE r.partner_id=NEW.partner_id AND r.enabled AND r.role IN ('SUPPLIER','FACTORY')) THEN
  RAISE EXCEPTION 'Supplier membership requires enabled SUPPLIER or FACTORY Partner';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER supplier_member_role_guard BEFORE INSERT OR UPDATE OF partner_id,status
 ON identity.supplier_memberships FOR EACH ROW EXECUTE FUNCTION identity.require_upstream_partner_member();

INSERT INTO identity.permissions(id,description) VALUES
 ('supplier.po.read','Read upstream purchase orders of explicit active supplier memberships'),
 ('supplier.po.ack','Acknowledge a published upstream purchase order within membership scope')
ON CONFLICT(id) DO NOTHING;
INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('supplier_user','supplier.po.read'),
 ('supplier_user','supplier.po.ack')
ON CONFLICT DO NOTHING;

-- Idempotent submission journal; the existing Procurement PO remains the sole business authority.
CREATE TABLE procurement.supplier_po_acknowledgements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 po_id uuid NOT NULL REFERENCES procurement.purchase_orders(id) ON DELETE RESTRICT,
 client_request_id uuid NOT NULL,
 supplier_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
 submitted_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 po_version integer NOT NULL CHECK(po_version>0),
 note text NOT NULL CHECK(length(trim(note)) BETWEEN 5 AND 1000),
 confirmation_id uuid REFERENCES procurement.supplier_confirmations(id) ON DELETE RESTRICT,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(po_id,client_request_id),
 UNIQUE(po_id,confirmation_id)
);
CREATE INDEX supplier_po_ack_partner_idx ON procurement.supplier_po_acknowledgements(supplier_partner_id,submitted_at DESC);

-- Original confirmation is immutable evidence. Do not allow later editing acknowledgement.
CREATE OR REPLACE FUNCTION procurement.reject_supplier_ack_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Supplier purchase order acknowledgement is append-only'; END; $$;
CREATE TRIGGER supplier_ack_immutable BEFORE UPDATE OR DELETE ON procurement.supplier_po_acknowledgements
 FOR EACH ROW EXECUTE FUNCTION procurement.reject_supplier_ack_mutation();
