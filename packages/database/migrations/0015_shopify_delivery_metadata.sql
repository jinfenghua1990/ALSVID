ALTER TABLE integrations.webhook_receipts
  ADD COLUMN IF NOT EXISTS provider_correlation_id text,
  ADD COLUMN IF NOT EXISTS provider_api_version text,
  ADD COLUMN IF NOT EXISTS source_account text;

CREATE INDEX IF NOT EXISTS integrations_webhook_correlation_idx
  ON integrations.webhook_receipts(channel_id, provider_correlation_id, received_at DESC)
  WHERE provider_correlation_id IS NOT NULL;
