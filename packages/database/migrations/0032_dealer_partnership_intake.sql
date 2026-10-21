-- Applicant records are never treated as verified or approved partners.
CREATE TABLE IF NOT EXISTS partners.dealer_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_request_id uuid NOT NULL UNIQUE,
 company_name varchar(160) NOT NULL,
 contact_name varchar(120) NOT NULL,
 email varchar(254) NOT NULL,
 country_code varchar(5) NOT NULL CHECK (country_code IN ('DE','AT','OTHER')),
 partnership_type varchar(15) NOT NULL CHECK (partnership_type IN ('retail','demo','service','multiple')),
 website varchar(240),
 message varchar(1600),
 locale varchar(2) NOT NULL CHECK (locale IN ('de','en','zh')),
 consent_at timestamptz NOT NULL DEFAULT now(),
 status varchar(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','REVIEWING','CONTACTED','CLOSED')),
 submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dealer_applications_email_idx ON partners.dealer_applications (lower(email),submitted_at DESC);
CREATE INDEX IF NOT EXISTS dealer_applications_status_idx ON partners.dealer_applications (status,submitted_at DESC);
-- Public locations are expressly approved projections, not private Partner records.
CREATE TABLE IF NOT EXISTS partners.public_locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partner_id uuid REFERENCES partners.partners(id) ON DELETE RESTRICT,
 display_name varchar(160) NOT NULL,
 country_code varchar(2) NOT NULL CHECK (country_code IN ('DE','AT')),
 city varchar(120) NOT NULL,
 address varchar(300) NOT NULL,
 sales_authorized boolean NOT NULL DEFAULT false,
 service_authorized boolean NOT NULL DEFAULT false,
 approved_for_publication boolean NOT NULL DEFAULT false,
 authorization_active boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (sales_authorized OR service_authorized)
);
CREATE INDEX IF NOT EXISTS public_locations_lookup_idx ON partners.public_locations (country_code,approved_for_publication,authorization_active);
