CREATE TABLE IF NOT EXISTS identity.auth_rate_limits (
  bucket_hash char(64) PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_auth_rate_limits_window_idx
  ON identity.auth_rate_limits(window_started_at);
