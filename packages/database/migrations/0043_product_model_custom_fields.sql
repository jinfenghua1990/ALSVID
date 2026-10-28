-- Admin-only model-level custom fields. No sample data; preserve existing stable product IDs.
ALTER TABLE product.models
  ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(custom_fields) = 'object');

CREATE TABLE product.model_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_code text NOT NULL REFERENCES product.product_types(code) ON DELETE RESTRICT,
  code text NOT NULL CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{0,31}$'),
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  field_type text NOT NULL CHECK (field_type IN ('TEXT','NUMBER','BOOLEAN','SELECT')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options)='array'),
  required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETIRED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_type_code,code),
  CHECK (field_type='SELECT' OR options='[]'::jsonb)
);
COMMENT ON TABLE product.model_field_definitions IS
  'User-configured model attributes. Not SKU identity, price, stock or BOM facts.';
