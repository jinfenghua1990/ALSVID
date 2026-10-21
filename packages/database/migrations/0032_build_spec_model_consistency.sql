-- Keep a SKU tied to a Build Specification belonging to the SAME product model.
-- Existing Build Specifications are not modified by this migration. Draft or
-- released rows with historical mismatches must be audited separately.
CREATE OR REPLACE FUNCTION engineering.require_build_spec_model_consistency()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sku_model_id uuid;
  bom_model_id uuid;
BEGIN
  SELECT v.model_id INTO sku_model_id
  FROM product.skus s
  JOIN product.variants v ON v.id = s.variant_id
  WHERE s.id = NEW.sku_id;

  SELECT b.model_id INTO bom_model_id
  FROM engineering.bom_revisions r
  JOIN engineering.boms b ON b.id = r.bom_id
  WHERE r.id = NEW.bom_revision_id;

  IF sku_model_id IS NULL OR bom_model_id IS NULL
     OR sku_model_id IS DISTINCT FROM bom_model_id THEN
    RAISE EXCEPTION 'Build Specification SKU and BOM revision must belong to the same model'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER build_spec_model_consistency_guard
BEFORE INSERT OR UPDATE OF sku_id, bom_revision_id, status
ON engineering.build_specs
FOR EACH ROW
EXECUTE FUNCTION engineering.require_build_spec_model_consistency();
