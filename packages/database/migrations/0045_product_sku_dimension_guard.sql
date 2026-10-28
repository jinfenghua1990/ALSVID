-- Reject *future* duplicate usable SKU combinations without mutating historic SKU IDs.
-- Existing duplicates are intentionally left intact for audit and manual remediation.
-- Unspecified (all-null) dimensions are valid for legacy or engineering-only SKUs.
CREATE OR REPLACE FUNCTION product.guard_sku_dimension_combination()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'RETIRED' OR
     (NEW.market_code IS NULL AND NULLIF(btrim(NEW.color_code),'') IS NULL
       AND NULLIF(btrim(NEW.size_code),'') IS NULL) THEN
    RETURN NEW;
  END IF;
  -- Serializes concurrent creation/activation/edits within the same variant.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.variant_id::text, 20261028));
  IF EXISTS (
    SELECT 1 FROM product.skus prior
    WHERE prior.variant_id = NEW.variant_id
      AND prior.id <> NEW.id
      AND prior.status <> 'RETIRED'
      AND upper(btrim(coalesce(prior.market_code,''))) =
          upper(btrim(coalesce(NEW.market_code,'')))
      AND upper(btrim(coalesce(prior.color_code,''))) =
          upper(btrim(coalesce(NEW.color_code,'')))
      AND upper(btrim(coalesce(prior.size_code,''))) =
          upper(btrim(coalesce(NEW.size_code,'')))
  ) THEN
    RAISE EXCEPTION 'Variant already has a non-retired SKU with this market/color/size'
      USING ERRCODE = '23505', CONSTRAINT = 'product_sku_dimension_combination_guard';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER product_sku_dimension_combination_guard
BEFORE INSERT OR UPDATE OF variant_id,market_code,color_code,size_code,status
ON product.skus
FOR EACH ROW EXECUTE FUNCTION product.guard_sku_dimension_combination();
