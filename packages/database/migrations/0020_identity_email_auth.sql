ALTER TABLE identity.users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Existing active accounts predate email verification. Preserve their ability to
-- sign in while making all newly-created Internal accounts prove email control.
UPDATE identity.users
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email_verified_at IS NULL;

INSERT INTO identity.roles(id, name, description) VALUES
  ('internal_user', 'Internal user', 'Verified ALSVID internal employee account')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS identity.email_verification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(email)),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_email_challenges_lookup_idx
  ON identity.email_verification_challenges(email, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS identity_email_challenges_one_active_idx
  ON identity.email_verification_challenges(email)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS identity.registration_invites (
  email text PRIMARY KEY CHECK (email = lower(email)),
  invited_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_registration_invites_active_idx
  ON identity.registration_invites(email, expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
