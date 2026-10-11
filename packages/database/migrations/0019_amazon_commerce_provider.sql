ALTER TABLE commerce.channels
  DROP CONSTRAINT IF EXISTS channels_provider_check;

ALTER TABLE commerce.channels
  ADD CONSTRAINT channels_provider_check
  CHECK (provider IN ('SHOPIFY','AMAZON','OTHER'));
