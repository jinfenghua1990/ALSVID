-- Append-only internal service evidence. No warranty entitlement, owner verification,
-- inventory movement, payable, customer notification or final legal warranty decision.
INSERT INTO identity.permissions(id, description) VALUES
  ('service.warranty.review', 'Record internal preliminary warranty evidence assessments')
ON CONFLICT (id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id, permission_id) VALUES
  ('system_admin','service.warranty.review')
ON CONFLICT DO NOTHING;

CREATE TABLE service.case_activities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES service.cases(id) ON DELETE RESTRICT,
 client_request_id uuid NOT NULL,
 kind text NOT NULL CHECK (kind IN ('DIAGNOSIS','REPAIR_NOTE','WARRANTY_ASSESSMENT')),
 note text NOT NULL CHECK (length(trim(note)) BETWEEN 10 AND 3000),
 labor_minutes integer,
 assessment text,
 actor_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (case_id,client_request_id),
 CHECK (
   (kind = 'DIAGNOSIS' AND labor_minutes IS NULL AND assessment IS NULL)
   OR (kind = 'REPAIR_NOTE' AND labor_minutes IS NOT NULL AND labor_minutes BETWEEN 0 AND 1440 AND assessment IS NULL)
   OR (kind = 'WARRANTY_ASSESSMENT' AND labor_minutes IS NULL
       AND assessment IS NOT NULL AND assessment IN ('EVIDENCE_REQUIRED','POSSIBLY_COVERED','POSSIBLY_EXCLUDED'))
 )
);
CREATE INDEX service_case_activities_case_idx ON service.case_activities(case_id,occurred_at,id);

CREATE TRIGGER service_activities_immutable BEFORE UPDATE OR DELETE ON service.case_activities
 FOR EACH ROW EXECUTE FUNCTION service.prevent_history_mutation();

-- Constrain internal evidence write paths even if a non-API SQL client is used.
CREATE OR REPLACE FUNCTION service.require_open_case_for_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status text;
BEGIN
 SELECT status INTO current_status FROM service.cases WHERE id=NEW.case_id FOR UPDATE;
 IF current_status NOT IN ('TRIAGED','IN_PROGRESS') THEN
   RAISE EXCEPTION 'Service activity requires TRIAGED or IN_PROGRESS case';
 END IF;
 IF NEW.kind='REPAIR_NOTE' AND current_status <> 'IN_PROGRESS' THEN
   RAISE EXCEPTION 'Repair work requires IN_PROGRESS case';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER service_activities_validate_case BEFORE INSERT ON service.case_activities
 FOR EACH ROW EXECUTE FUNCTION service.require_open_case_for_activity();
