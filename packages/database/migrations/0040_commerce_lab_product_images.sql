-- Assets remains the binary-object metadata owner; proposals keep only a cover reference.
ALTER TABLE commerce_lab.catalog_products
  ADD COLUMN cover_asset_id uuid REFERENCES assets.objects(id) ON DELETE RESTRICT;
ALTER TABLE assets.links DROP CONSTRAINT links_entity_type_check;
ALTER TABLE assets.links ADD CONSTRAINT links_entity_type_check CHECK (
  entity_type IN ('product.platform','product.model','product.variant','product.sku','engineering.part',
    'engineering.bom_revision','engineering.build_spec','commerce_lab.catalog_product')
);
CREATE INDEX commerce_lab_cover_asset ON commerce_lab.catalog_products(cover_asset_id)
  WHERE cover_asset_id IS NOT NULL;
