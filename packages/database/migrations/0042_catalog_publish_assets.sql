-- Public catalogue artwork allowlist becomes reviewable data instead of code.
--
-- Before this migration the only publishable models were the FC1/FC2 constants in
-- domains/product/src/core/publication.ts, repeated in three SQL guards and in the
-- Admin panel. Adding a model therefore required editing code, a migration and the
-- web app in lockstep. The application constant is now only a fallback floor: rows
-- here override it, and enabled=false removes a model again.
CREATE TABLE product.catalog_publish_assets (
  model_code text PRIMARY KEY CHECK (model_code ~ '^[A-Z0-9][A-Z0-9_-]{1,40}$'),
  image_path text NOT NULL CHECK (image_path ~ '^/[A-Za-z0-9._/-]+$'),
  enabled boolean NOT NULL DEFAULT true,
  evidence_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed exactly the models that were publishable before this migration so that
-- enabling the table changes no behaviour until someone edits it.
INSERT INTO product.catalog_publish_assets(model_code,image_path,enabled,evidence_note) VALUES
  ('FC1','/home/original/fc1-product.webp',true,'Seeded from the previous approvedCatalogAssets constant'),
  ('FC2','/products/fc2/side-studio-1536.webp',true,'Seeded from the previous approvedCatalogAssets constant')
ON CONFLICT (model_code) DO NOTHING;

COMMENT ON TABLE product.catalog_publish_assets IS
  'Reviewed public catalogue artwork per model code. Overrides the built-in fallback; enabled=false withdraws a model from publication eligibility.';
