-- Persisted third-party warehouse configuration and integration evidence.
-- This migration stores metadata and Secret Manager resource references only;
-- it deliberately never stores provider credentials or raw webhook payloads.

CREATE TABLE integrations.warehouse_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL CHECK (provider_code = upper(provider_code) AND provider_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 120),
  account_ref text NOT NULL CHECK (length(trim(account_ref)) BETWEEN 1 AND 255),
  credentials_secret_ref text,
  connection_status text NOT NULL DEFAULT 'NOT_CONFIGURED'
    CHECK (connection_status IN ('NOT_CONFIGURED','PENDING_REVIEW','CONNECTED','ERROR','PAUSED')),
  capabilities text[] NOT NULL DEFAULT '{}',
  last_probe_at timestamptz,
  last_success_at timestamptz,
  last_error_code text,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_code, account_ref),
  CHECK (
    credentials_secret_ref IS NULL
    OR credentials_secret_ref ~ '^projects/[a-z][a-z0-9-]{4,28}[a-z0-9]/secrets/[A-Za-z0-9_-]{1,255}/versions/(latest|[1-9][0-9]*)$'
  ),
  CHECK (
    (credentials_secret_ref IS NULL AND connection_status = 'NOT_CONFIGURED')
    OR (credentials_secret_ref IS NOT NULL AND connection_status <> 'NOT_CONFIGURED')
  )
);
CREATE INDEX warehouse_provider_status_idx
  ON integrations.warehouse_provider_connections(connection_status, updated_at DESC);

CREATE TABLE integrations.external_warehouse_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integrations.warehouse_provider_connections(id) ON DELETE RESTRICT,
  internal_warehouse_id uuid NOT NULL REFERENCES warehouse.warehouses(id) ON DELETE RESTRICT,
  external_warehouse_id text NOT NULL CHECK (length(trim(external_warehouse_id)) BETWEEN 1 AND 255),
  external_code text NOT NULL CHECK (length(trim(external_code)) BETWEEN 1 AND 120),
  external_name text NOT NULL CHECK (length(trim(external_name)) BETWEEN 1 AND 255),
  mapping_status text NOT NULL DEFAULT 'PENDING'
    CHECK (mapping_status IN ('PENDING','VERIFIED','REJECTED','INACTIVE')),
  last_verified_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_warehouse_id)
);
CREATE INDEX external_warehouse_mapping_internal_idx
  ON integrations.external_warehouse_mappings(internal_warehouse_id, mapping_status);

CREATE TABLE integrations.external_sku_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integrations.warehouse_provider_connections(id) ON DELETE RESTRICT,
  internal_sku_id uuid NOT NULL REFERENCES product.skus(id) ON DELETE RESTRICT,
  external_sku text NOT NULL CHECK (length(trim(external_sku)) BETWEEN 1 AND 255),
  external_item_id text NOT NULL CHECK (length(trim(external_item_id)) BETWEEN 1 AND 255),
  mapping_status text NOT NULL DEFAULT 'PENDING'
    CHECK (mapping_status IN ('PENDING','VERIFIED','REJECTED','INACTIVE')),
  last_verified_at timestamptz,
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, external_sku),
  UNIQUE (connection_id, external_item_id)
);
CREATE INDEX external_sku_mapping_internal_idx
  ON integrations.external_sku_mappings(internal_sku_id, mapping_status);

CREATE TABLE integrations.warehouse_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integrations.warehouse_provider_connections(id) ON DELETE RESTRICT,
  sync_type text NOT NULL CHECK (sync_type IN ('WAREHOUSE_LIST','SKU_MAPPING_VALIDATION','INVENTORY_SNAPSHOT','FULFILLMENT_STATUS','SHIPMENT_TRACKING','RECONCILIATION')),
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','PARTIAL','FAILED','CANCELLED')),
  source_ref text,
  cursor_before text,
  cursor_after text,
  records_seen integer NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  records_accepted integer NOT NULL DEFAULT 0 CHECK (records_accepted >= 0),
  records_rejected integer NOT NULL DEFAULT 0 CHECK (records_rejected >= 0),
  retryable boolean NOT NULL DEFAULT false,
  error_code text,
  error_message text NOT NULL DEFAULT '',
  requested_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (records_accepted + records_rejected <= records_seen),
  CHECK (completed_at IS NULL OR started_at IS NOT NULL)
);
CREATE INDEX warehouse_sync_runs_connection_idx
  ON integrations.warehouse_sync_runs(connection_id, created_at DESC);
CREATE INDEX warehouse_sync_runs_retry_idx
  ON integrations.warehouse_sync_runs(status, retryable, created_at)
  WHERE status = 'FAILED' AND retryable = true;

CREATE TABLE integrations.warehouse_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integrations.warehouse_provider_connections(id) ON DELETE RESTRICT,
  external_event_id text NOT NULL CHECK (length(trim(external_event_id)) BETWEEN 1 AND 255),
  event_type text NOT NULL CHECK (length(trim(event_type)) BETWEEN 1 AND 120),
  source_ref text,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  source_occurred_at timestamptz,
  outcome text NOT NULL DEFAULT 'RECEIVED'
    CHECK (outcome IN ('RECEIVED','PROCESSED','REJECTED','NOOP')),
  error_code text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (connection_id, external_event_id)
);
CREATE INDEX warehouse_provider_events_recent_idx
  ON integrations.warehouse_provider_events(connection_id, received_at DESC);
