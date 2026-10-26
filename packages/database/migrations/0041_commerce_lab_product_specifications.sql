-- Ordered localized display specifications for the independent catalog.
-- Existing records keep an empty list; no Product/Engineering/SKU facts are rewritten.
ALTER TABLE commerce_lab.catalog_products
  ADD COLUMN specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT commerce_lab_specifications_array CHECK (
    jsonb_typeof(specifications) = 'array' AND jsonb_array_length(specifications) <= 20
  );
