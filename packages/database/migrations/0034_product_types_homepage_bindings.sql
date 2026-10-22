-- Product type is a customer-facing commercial classification, not the FC/CT/FT/GT engineering platform.
CREATE TABLE product.product_types (
  code text PRIMARY KEY CHECK (code = upper(code)),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RETIRED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO product.product_types(code,name,description) VALUES
  ('BIKE','整车','Commercial complete bicycle models'),
  ('ACCESSORY','配件','Sellable accessories and optional equipment'),
  ('SERVICE_PART','维修零件','Sellable after-sales and replacement parts')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE product.models
  ADD COLUMN product_type_code text NOT NULL DEFAULT 'BIKE'
  REFERENCES product.product_types(code) ON DELETE RESTRICT;

-- Accessories / service parts do not belong to FC/CT/FT/GT technical platforms.
ALTER TABLE product.models ALTER COLUMN platform_id DROP NOT NULL;
ALTER TABLE product.models ADD CONSTRAINT product_model_platform_type_ck
  CHECK ((product_type_code = 'BIKE' AND platform_id IS NOT NULL) OR
         (product_type_code <> 'BIKE' AND platform_id IS NULL));

-- One official home slot can be automatically resolved or explicitly bound;
-- no manual product may silently alter a fixed FC1/FC2 photo or description.
CREATE TABLE product.homepage_product_bindings (
  slot_code text PRIMARY KEY CHECK (slot_code IN ('FC1_HERO','FC1_FEATURED','FC2_LAUNCH')),
  target_model_code text NOT NULL,
  mode text NOT NULL DEFAULT 'AUTO' CHECK (mode IN ('AUTO','MANUAL')),
  manual_model_id uuid REFERENCES product.models(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((mode='AUTO' AND manual_model_id IS NULL) OR (mode='MANUAL' AND manual_model_id IS NOT NULL))
);

INSERT INTO product.homepage_product_bindings(slot_code,target_model_code) VALUES
 ('FC1_HERO','FC1'),('FC1_FEATURED','FC1'),('FC2_LAUNCH','FC2')
ON CONFLICT (slot_code) DO NOTHING;
