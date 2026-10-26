-- Independent comparison data, not ALSVID Product/Inventory/Finance authority.
CREATE SCHEMA IF NOT EXISTS commerce_lab;
CREATE TABLE commerce_lab.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{1,40}$'),
  title jsonb NOT NULL CHECK (jsonb_typeof(title) = 'object'),
  description jsonb NOT NULL CHECK (jsonb_typeof(description) = 'object'),
  reference_image text CHECK (reference_image IN ('FC1','FC2')),
  proposed_price_minor integer CHECK (proposed_price_minor >= 0 AND proposed_price_minor <= 100000000),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES identity.users(id),
  updated_by uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commerce_lab_catalog_public ON commerce_lab.catalog_products(status, created_at DESC, id);
COMMENT ON TABLE commerce_lab.catalog_products IS
  'Independent storefront comparison proposals. Not approved prices, stock, SKUs or live orders.';
