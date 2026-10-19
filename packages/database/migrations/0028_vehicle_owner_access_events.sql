-- Vehicle domain owns the append-only vehicle/verified account relation.
-- Admin evidence must establish a completed handover; VIN or matching email alone never grants access.
INSERT INTO identity.permissions(id,description) VALUES
 ('vehicle.owner.manage','Record a manually verified vehicle handover or revoke ownership access')
ON CONFLICT(id) DO NOTHING;
INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('system_admin','vehicle.owner.manage')
ON CONFLICT DO NOTHING;

CREATE TABLE vehicle.owner_access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 vehicle_id uuid NOT NULL REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
 customer_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 event_kind text NOT NULL CHECK(event_kind IN ('GRANTED','REVOKED')),
 evidence_ref text NOT NULL CHECK(length(trim(evidence_ref)) BETWEEN 12 AND 200),
 performed_by uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_owner_events_latest_idx ON vehicle.owner_access_events(vehicle_id,event_no DESC);
CREATE INDEX vehicle_owner_events_user_idx ON vehicle.owner_access_events(customer_user_id,event_no DESC);
CREATE OR REPLACE FUNCTION vehicle.prevent_owner_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Vehicle ownership access evidence is append-only'; END; $$;
CREATE TRIGGER owner_access_events_immutable BEFORE UPDATE OR DELETE ON vehicle.owner_access_events
 FOR EACH ROW EXECUTE FUNCTION vehicle.prevent_owner_event_mutation();
