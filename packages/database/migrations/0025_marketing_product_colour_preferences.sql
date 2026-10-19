-- Preference signals are not orders, stock reservations or customer records.
-- One current preference per browser session and product (latest selection wins).
CREATE SCHEMA IF NOT EXISTS marketing;

CREATE TABLE IF NOT EXISTS marketing.product_colour_preferences (
  product_code text NOT NULL CHECK (product_code = 'FC1'),
  session_key uuid NOT NULL,
  model_code text NOT NULL CHECK (model_code IN ('standard', 'pro')),
  colour_code text NOT NULL CHECK (colour_code IN ('sample', 'black', 'blue', 'silver')),
  locale text NOT NULL CHECK (locale IN ('zh', 'en', 'de')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_code, session_key)
);

CREATE INDEX IF NOT EXISTS idx_product_colour_preferences_updated
  ON marketing.product_colour_preferences(product_code, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_colour_preferences_colour
  ON marketing.product_colour_preferences(product_code, colour_code);
