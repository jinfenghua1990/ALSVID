INSERT INTO identity.permissions(id,description) VALUES
 ('vehicle.handover','Record dealer-to-customer Vehicle handover evidence'),
 ('vehicle.ownership.write','Record Vehicle ownership acquisition release and transfer evidence'),
 ('vehicle.garage.read','View a Partner My ALSVID garage and Vehicle ownership history')
ON CONFLICT(id) DO NOTHING;

INSERT INTO identity.role_permissions(role_id,permission_id) VALUES
 ('vehicle_manager','vehicle.handover'),('vehicle_manager','vehicle.ownership.write'),('vehicle_manager','vehicle.garage.read'),
 ('production_viewer','vehicle.garage.read')
ON CONFLICT DO NOTHING;
INSERT INTO identity.role_permissions(role_id,permission_id)
SELECT 'system_admin',id FROM identity.permissions WHERE id IN('vehicle.handover','vehicle.ownership.write','vehicle.garage.read')
ON CONFLICT DO NOTHING;

CREATE SEQUENCE vehicle.lifecycle_event_seq START 1;
CREATE SEQUENCE vehicle.ownership_event_seq START 1;
CREATE SEQUENCE vehicle.handover_seq START 1;

CREATE TABLE vehicle.lifecycle_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sequence_no bigint NOT NULL UNIQUE DEFAULT nextval('vehicle.lifecycle_event_seq'),
 vehicle_id uuid NOT NULL REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
 state text NOT NULL CHECK(state IN('BORN','HANDED_OVER','OWNED','UNOWNED','RETIRED')),
 event_type text NOT NULL CHECK(event_type IN('BIRTH','CUSTOMER_HANDOVER','OWNERSHIP_ACQUIRED','OWNERSHIP_RELEASED','OWNERSHIP_TRANSFERRED','RETIRED')),
 source_type text NOT NULL CHECK(source_type IN('VEHICLE','HANDOVER','OWNERSHIP')),
 source_id uuid,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 note text NOT NULL DEFAULT '',
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_lifecycle_timeline_idx ON vehicle.lifecycle_events(vehicle_id,occurred_at,sequence_no);

CREATE TABLE vehicle.handovers(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 handover_number text NOT NULL UNIQUE DEFAULT ('HO-'||lpad(nextval('vehicle.handover_seq')::text,9,'0')),
 vehicle_id uuid NOT NULL UNIQUE REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
 dealer_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
 customer_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
 handed_over_at timestamptz NOT NULL,
 reference text,
 note text NOT NULL DEFAULT '',
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(dealer_partner_id<>customer_partner_id)
);
CREATE INDEX vehicle_handovers_customer_idx ON vehicle.handovers(customer_partner_id,handed_over_at DESC);
CREATE INDEX vehicle_handovers_dealer_idx ON vehicle.handovers(dealer_partner_id,handed_over_at DESC);

CREATE TABLE vehicle.ownership_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sequence_no bigint NOT NULL UNIQUE DEFAULT nextval('vehicle.ownership_event_seq'),
 vehicle_id uuid NOT NULL REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
 event_type text NOT NULL CHECK(event_type IN('ACQUIRED','RELEASED')),
 owner_partner_id uuid NOT NULL REFERENCES partners.partners(id) ON DELETE RESTRICT,
 counterparty_partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
 handover_id uuid REFERENCES vehicle.handovers(id) ON DELETE RESTRICT,
 occurred_at timestamptz NOT NULL,
 reason text NOT NULL DEFAULT '',
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(counterparty_partner_id IS NULL OR counterparty_partner_id<>owner_partner_id)
);
CREATE INDEX vehicle_ownership_timeline_idx ON vehicle.ownership_events(vehicle_id,sequence_no);
CREATE INDEX vehicle_ownership_partner_idx ON vehicle.ownership_events(owner_partner_id,sequence_no DESC);

CREATE OR REPLACE VIEW vehicle.v_current_ownership AS
SELECT v.id AS vehicle_id,
 CASE WHEN latest.event_type='ACQUIRED' THEN latest.owner_partner_id ELSE NULL END AS owner_partner_id,
 CASE WHEN latest.event_type='ACQUIRED' THEN latest.occurred_at ELSE NULL END AS owned_since,
 latest.event_type AS latest_ownership_event,
 latest.sequence_no AS latest_ownership_sequence
FROM vehicle.vehicles v
LEFT JOIN LATERAL(
 SELECT e.event_type,e.owner_partner_id,e.occurred_at,e.sequence_no
 FROM vehicle.ownership_events e WHERE e.vehicle_id=v.id
 ORDER BY e.sequence_no DESC LIMIT 1
) latest ON true;

CREATE OR REPLACE VIEW vehicle.v_current_lifecycle AS
SELECT v.id AS vehicle_id,COALESCE(latest.state,'BORN') AS lifecycle_state,latest.occurred_at AS lifecycle_changed_at,latest.sequence_no
FROM vehicle.vehicles v
LEFT JOIN LATERAL(
 SELECT e.state,e.occurred_at,e.sequence_no FROM vehicle.lifecycle_events e
 WHERE e.vehicle_id=v.id ORDER BY e.sequence_no DESC LIMIT 1
) latest ON true;

CREATE OR REPLACE FUNCTION vehicle.reject_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Vehicle lifecycle evidence is append-only'; END;
$$;
CREATE TRIGGER vehicle_lifecycle_no_mutation BEFORE UPDATE OR DELETE ON vehicle.lifecycle_events FOR EACH ROW EXECUTE FUNCTION vehicle.reject_evidence_mutation();
CREATE TRIGGER vehicle_handover_no_mutation BEFORE UPDATE OR DELETE ON vehicle.handovers FOR EACH ROW EXECUTE FUNCTION vehicle.reject_evidence_mutation();
CREATE TRIGGER vehicle_ownership_no_mutation BEFORE UPDATE OR DELETE ON vehicle.ownership_events FOR EACH ROW EXECUTE FUNCTION vehicle.reject_evidence_mutation();

CREATE OR REPLACE FUNCTION vehicle.validate_handover() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE born timestamptz;
BEGIN
 SELECT born_at INTO born FROM vehicle.vehicles WHERE id=NEW.vehicle_id;
 IF born IS NULL THEN RAISE EXCEPTION 'Vehicle not found'; END IF;
 IF NEW.handed_over_at<born THEN RAISE EXCEPTION 'Vehicle handover cannot occur before Vehicle birth'; END IF;
 IF NOT EXISTS(SELECT 1 FROM partners.roles WHERE partner_id=NEW.dealer_partner_id AND role='DEALER' AND enabled=true) THEN RAISE EXCEPTION 'Vehicle handover Dealer must have DEALER Partner role'; END IF;
 IF NOT EXISTS(SELECT 1 FROM partners.roles WHERE partner_id=NEW.customer_partner_id AND role='CUSTOMER' AND enabled=true) THEN RAISE EXCEPTION 'Vehicle handover Customer must have CUSTOMER Partner role'; END IF;
 IF EXISTS(SELECT 1 FROM vehicle.v_current_ownership WHERE vehicle_id=NEW.vehicle_id AND owner_partner_id IS NOT NULL) THEN RAISE EXCEPTION 'Vehicle already has a current owner'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_handover_guard BEFORE INSERT ON vehicle.handovers FOR EACH ROW EXECUTE FUNCTION vehicle.validate_handover();

CREATE OR REPLACE FUNCTION vehicle.validate_ownership_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_event text;current_owner uuid;latest_time timestamptz;born timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('vehicle-owner:'||NEW.vehicle_id::text));
 SELECT born_at INTO born FROM vehicle.vehicles WHERE id=NEW.vehicle_id;
 IF born IS NULL THEN RAISE EXCEPTION 'Vehicle not found'; END IF;
 IF NEW.occurred_at<born THEN RAISE EXCEPTION 'Vehicle ownership event cannot occur before Vehicle birth'; END IF;
 IF NOT EXISTS(SELECT 1 FROM partners.roles WHERE partner_id=NEW.owner_partner_id AND role='CUSTOMER' AND enabled=true) THEN RAISE EXCEPTION 'Vehicle owner must have CUSTOMER Partner role'; END IF;
 SELECT event_type,owner_partner_id,occurred_at INTO current_event,current_owner,latest_time
 FROM vehicle.ownership_events WHERE vehicle_id=NEW.vehicle_id ORDER BY sequence_no DESC LIMIT 1;
 IF latest_time IS NOT NULL AND NEW.occurred_at<latest_time THEN RAISE EXCEPTION 'Vehicle ownership events must be appended in chronological order'; END IF;
 IF NEW.event_type='ACQUIRED' THEN
   IF current_event='ACQUIRED' THEN RAISE EXCEPTION 'Vehicle current owner must be released before another owner acquires it'; END IF;
 ELSIF NEW.event_type='RELEASED' THEN
   IF current_event IS DISTINCT FROM 'ACQUIRED' OR current_owner IS DISTINCT FROM NEW.owner_partner_id THEN RAISE EXCEPTION 'Vehicle release must reference the current owner'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_ownership_guard BEFORE INSERT ON vehicle.ownership_events FOR EACH ROW EXECUTE FUNCTION vehicle.validate_ownership_event();

CREATE OR REPLACE FUNCTION vehicle.capture_birth_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO vehicle.lifecycle_events(vehicle_id,state,event_type,source_type,source_id,occurred_at,created_by)
 VALUES(NEW.id,'BORN','BIRTH','VEHICLE',NEW.id,NEW.born_at,NEW.created_by);
 RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_birth_lifecycle AFTER INSERT ON vehicle.vehicles FOR EACH ROW EXECUTE FUNCTION vehicle.capture_birth_lifecycle();

INSERT INTO vehicle.lifecycle_events(vehicle_id,state,event_type,source_type,source_id,occurred_at,created_by)
SELECT v.id,'BORN','BIRTH','VEHICLE',v.id,v.born_at,v.created_by FROM vehicle.vehicles v
WHERE NOT EXISTS(SELECT 1 FROM vehicle.lifecycle_events e WHERE e.vehicle_id=v.id AND e.event_type='BIRTH');
