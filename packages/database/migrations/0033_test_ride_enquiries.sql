-- Test-ride requests are customer enquiries, never orders or confirmed appointments.
-- Reuse only previously approved partner locations; no new public dealer record is implied.
ALTER TABLE partners.public_locations
  ADD COLUMN IF NOT EXISTS test_ride_authorized boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS partners.test_ride_enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(80),
 email varchar(254) NOT NULL,
 country_code char(2) NOT NULL CHECK(country_code IN ('DE','AT')),
 city varchar(80) NOT NULL,
 model varchar(40) NOT NULL,
 colour varchar(60) NOT NULL,
 locale varchar(2) NOT NULL CHECK(locale IN ('zh','de','en')),
 status varchar(20) NOT NULL DEFAULT 'NEW'
   CHECK(status IN ('NEW','REVIEWING','CONTACTED','CLOSED')),
 assigned_location_id uuid REFERENCES partners.public_locations(id) ON DELETE RESTRICT,
 notification_state varchar(16) NOT NULL DEFAULT 'PENDING'
   CHECK(notification_state IN ('PENDING','SENT','FAILED','UNCONFIGURED')),
 consent_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS test_ride_enquiries_recent_idx
 ON partners.test_ride_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS test_ride_enquiries_status_idx
 ON partners.test_ride_enquiries(status,created_at DESC);
CREATE INDEX IF NOT EXISTS test_ride_enquiries_email_idx
 ON partners.test_ride_enquiries(lower(email),created_at DESC);
