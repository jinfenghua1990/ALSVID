-- Service domain: internal vehicle service-case intake and lifecycle.
-- No implicit customer ownership, warranty entitlement, parts consumption, or WMS stock movement.
CREATE SCHEMA IF NOT EXISTS service;

INSERT INTO identity.permissions(id,description) VALUES
 ('service.read','Read internal vehicle service cases'),
 ('service.write','Create and process internal vehicle service cases')
ON CONFLICT(id) DO NOTHING;

INSERT INTO identity.roles(id,name,description) VALUES
 ('service_agent','Service agent','Internal staff handling vehicle service cases')
ON CONFLICT(id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('service_agent','service.read'),
 ('service_agent','service.write'),
 ('service_agent','vehicle.read'),
 ('system_admin','service.read'),
 ('system_admin','service.write')
ON CONFLICT DO NOTHING;

CREATE SEQUENCE service.case_number_seq START 1;

CREATE TABLE service.cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_number text NOT NULL UNIQUE DEFAULT ('SR-' || lpad(nextval('service.case_number_seq')::text, 8, '0')),
 vehicle_id uuid NOT NULL REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
 category text NOT NULL CHECK(category IN ('ISSUE','WARRANTY_REVIEW','REPAIR_REQUEST')),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 5 AND 160),
 description text NOT NULL DEFAULT '' CHECK(length(description) <= 4000),
 status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','TRIAGED','IN_PROGRESS','RESOLVED','CLOSED')),
 version integer NOT NULL DEFAULT 1 CHECK(version > 0),
 created_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 updated_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_cases_vehicle_idx ON service.cases(vehicle_id,created_at DESC);
CREATE INDEX service_cases_status_idx ON service.cases(status,created_at DESC);

CREATE TABLE service.case_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES service.cases(id) ON DELETE RESTRICT,
 from_status text,
 to_status text NOT NULL CHECK(to_status IN ('NEW','TRIAGED','IN_PROGRESS','RESOLVED','CLOSED')),
 case_version integer NOT NULL CHECK(case_version > 0),
 actor_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,case_version)
);
CREATE INDEX service_case_history_idx ON service.case_history(case_id,occurred_at,id);

CREATE OR REPLACE FUNCTION service.prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'service.case_history is append-only';
END;
$$;
CREATE TRIGGER service_history_immutable BEFORE UPDATE OR DELETE ON service.case_history
 FOR EACH ROW EXECUTE FUNCTION service.prevent_history_mutation();

-- Case changes must be performed through Service application + history/audit transaction.
-- A database guard rejects lifecycle updates not accompanied by version movement.
CREATE OR REPLACE FUNCTION service.guard_case_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id OR NEW.created_by IS DISTINCT FROM OLD.created_by
 OR NEW.case_number IS DISTINCT FROM OLD.case_number OR NEW.category IS DISTINCT FROM OLD.category
 OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description
 OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Service case identity and intake details are immutable';
 END IF;
 IF NEW.version <> OLD.version + 1 OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
   RAISE EXCEPTION 'Service case status change requires one version increment';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER service_cases_guard_update BEFORE UPDATE ON service.cases
 FOR EACH ROW EXECUTE FUNCTION service.guard_case_update();
