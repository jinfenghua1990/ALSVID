CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS partners;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE identity.permissions (
  id text PRIMARY KEY,
  description text NOT NULL DEFAULT ''
);

CREATE TABLE identity.role_permissions (
  role_id text NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
  permission_id text NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE identity.user_roles (
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES identity.roles(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_sessions_active_idx ON identity.sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

INSERT INTO identity.permissions(id, description) VALUES
  ('identity.user.read', 'View ALSVID users'),
  ('identity.role.manage', 'Grant and revoke user roles'),
  ('audit.read', 'View audit evidence'),
  ('partner.read', 'View Partner master records'),
  ('partner.write', 'Create and edit Partner master records'),
  ('partner.role.manage', 'Grant and revoke Partner business roles')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.roles(id, name, description) VALUES
  ('system_admin', 'System administrator', 'Full ALSVID administration'),
  ('partner_manager', 'Partner manager', 'Manage Partner master records and roles'),
  ('partner_viewer', 'Partner viewer', 'Read-only Partner access'),
  ('auditor', 'Auditor', 'Read audit evidence')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id)
SELECT 'system_admin', id FROM identity.permissions
ON CONFLICT DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('partner_manager', 'partner.read'),
  ('partner_manager', 'partner.write'),
  ('partner_manager', 'partner.role.manage'),
  ('partner_viewer', 'partner.read'),
  ('auditor', 'audit.read')
ON CONFLICT DO NOTHING;

CREATE TABLE audit.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  request_id text,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_target_idx ON audit.events(target_type, target_id, occurred_at DESC);
CREATE INDEX audit_events_actor_idx ON audit.events(actor_user_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION audit.reject_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.events is append-only';
END;
$$;

CREATE TRIGGER audit_events_no_update
BEFORE UPDATE OR DELETE ON audit.events
FOR EACH ROW EXECUTE FUNCTION audit.reject_event_mutation();

CREATE SEQUENCE partners.partner_code_seq START 1;

CREATE TABLE partners.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code text NOT NULL UNIQUE DEFAULT ('P-' || lpad(nextval('partners.partner_code_seq')::text, 8, '0')),
  kind text NOT NULL CHECK (kind IN ('ORGANIZATION', 'PERSON')),
  display_name text NOT NULL,
  legal_name text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  country_code char(2),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partners_name_idx ON partners.partners(lower(display_name));

CREATE TABLE partners.identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE CASCADE,
  scheme text NOT NULL,
  raw_value text NOT NULL,
  normalized_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheme, normalized_value)
);
CREATE INDEX partner_identifiers_partner_idx ON partners.identifiers(partner_id);

CREATE TABLE partners.roles (
  partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('SUPPLIER', 'FACTORY', 'DEALER', 'CUSTOMER', 'SERVICE_PARTNER', 'LOGISTICS_PROVIDER')),
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, role)
);

CREATE TABLE partners.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('EMAIL', 'PHONE', 'WEBSITE')),
  purpose text NOT NULL CHECK (purpose IN ('GENERAL', 'SALES', 'FINANCE', 'SERVICE', 'LOGISTICS')),
  value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_contacts_partner_idx ON partners.contacts(partner_id);

CREATE TABLE partners.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('REGISTERED', 'BILLING', 'SHIPPING', 'WAREHOUSE', 'SERVICE')),
  recipient text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  region text,
  postal_code text,
  country_code char(2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_addresses_partner_idx ON partners.addresses(partner_id);
