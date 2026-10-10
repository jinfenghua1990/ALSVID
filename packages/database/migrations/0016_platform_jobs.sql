CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE platform.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue text NOT NULL CHECK (length(trim(queue)) > 0),
  job_type text NOT NULL CHECK (length(trim(job_type)) > 0),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
  priority integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  idempotency_key text,
  correlation_id text,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='RUNNING') = (locked_at IS NOT NULL AND locked_by IS NOT NULL))
);

CREATE UNIQUE INDEX platform_jobs_idempotency_uq ON platform.jobs(queue,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX platform_jobs_claim_idx ON platform.jobs(queue,status,priority DESC,available_at,created_at) WHERE status='PENDING';
CREATE INDEX platform_jobs_running_idx ON platform.jobs(locked_at) WHERE status='RUNNING';
