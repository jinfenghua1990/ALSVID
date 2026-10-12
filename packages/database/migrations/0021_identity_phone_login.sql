ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS phone_e164 text;

ALTER TABLE identity.users
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'identity_users_phone_e164_format_chk'
      AND conrelid = 'identity.users'::regclass
  ) THEN
    ALTER TABLE identity.users
      ADD CONSTRAINT identity_users_phone_e164_format_chk
      CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'identity_users_phone_verified_requires_phone_chk'
      AND conrelid = 'identity.users'::regclass
  ) THEN
    ALTER TABLE identity.users
      ADD CONSTRAINT identity_users_phone_verified_requires_phone_chk
      CHECK (phone_verified_at IS NULL OR phone_e164 IS NOT NULL);
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS identity_users_phone_e164_unique_idx
  ON identity.users(phone_e164)
  WHERE phone_e164 IS NOT NULL;

COMMENT ON COLUMN identity.users.phone_e164 IS
  'Optional E.164 phone identifier bound to an existing ALSVID identity. Phone-only Internal registration is not allowed.';

COMMENT ON COLUMN identity.users.phone_verified_at IS
  'Set only after phone ownership is verified. Only verified phones may be used for password login.';
