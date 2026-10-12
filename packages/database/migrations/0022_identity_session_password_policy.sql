ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS password_state text;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

UPDATE identity.users
SET password_state = CASE
  WHEN password_hash IS NULL THEN 'UNSET'
  ELSE 'INITIAL'
END
WHERE password_state IS NULL;

ALTER TABLE identity.users
  ALTER COLUMN password_state SET DEFAULT 'UNSET',
  ALTER COLUMN password_state SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'identity_users_password_state_check'
      AND conrelid = 'identity.users'::regclass
  ) THEN
    ALTER TABLE identity.users
      ADD CONSTRAINT identity_users_password_state_check
      CHECK (password_state IN ('UNSET', 'INITIAL', 'ACTIVE', 'RESET_REQUIRED'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS identity.security_policy (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  session_ttl_days integer NOT NULL DEFAULT 30 CHECK (session_ttl_days BETWEEN 1 AND 90),
  force_password_setup boolean NOT NULL DEFAULT true,
  risk_step_up_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO identity.security_policy(id, session_ttl_days, force_password_setup, risk_step_up_enabled)
VALUES ('default', 30, true, false)
ON CONFLICT (id) DO NOTHING;
