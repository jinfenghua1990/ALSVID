-- Authenticated My ALSVID owner submissions are recorded as Service facts.
-- Current GRANTED vehicle access is checked under a vehicle row lock before write.
-- Shopify OAuth and handover proof remain separate preconditions to production external launch.
CREATE TABLE service.owner_submission_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
 client_request_id uuid NOT NULL,
 vehicle_id uuid NOT NULL REFERENCES vehicle.vehicles(id) ON DELETE RESTRICT,
 case_id uuid NOT NULL UNIQUE REFERENCES service.cases(id) ON DELETE RESTRICT,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_user_id,client_request_id)
);
CREATE INDEX service_owner_submissions_vehicle_idx ON service.owner_submission_requests(vehicle_id,submitted_at DESC);
CREATE TRIGGER service_owner_submissions_immutable
 BEFORE UPDATE OR DELETE ON service.owner_submission_requests
 FOR EACH ROW EXECUTE FUNCTION service.prevent_history_mutation();
