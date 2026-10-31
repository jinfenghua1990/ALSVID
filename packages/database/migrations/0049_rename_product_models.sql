DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('FC1','A1-ULTRA'),
      ('FC2','L1-PRO'),
      ('L7','A1'),
      ('L8','L1')
    ) AS mapping(old_code,new_code)
    JOIN product.models old_model ON old_model.code=mapping.old_code
    JOIN product.models new_model ON new_model.code=mapping.new_code
    WHERE old_model.id<>new_model.id
  ) THEN
    RAISE EXCEPTION 'Product model rename target code already belongs to another model';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES ('FC1','A1-ULTRA'),('FC2','L1-PRO'),('L7','A1'),('L8','L1')) AS mapping(old_code,new_code)
    JOIN product.catalog_publish_assets old_asset ON old_asset.model_code=mapping.old_code
    JOIN product.catalog_publish_assets new_asset ON new_asset.model_code=mapping.new_code
  ) THEN
    RAISE EXCEPTION 'Product model rename target already has a separate catalogue asset record';
  END IF;
END;
$$;

ALTER TABLE marketing.product_colour_preferences
  DROP CONSTRAINT IF EXISTS product_colour_preferences_product_code_check;
UPDATE marketing.product_colour_preferences
SET product_code='A1-ULTRA'
WHERE product_code='FC1';
ALTER TABLE marketing.product_colour_preferences
  ADD CONSTRAINT product_colour_preferences_product_code_check CHECK (product_code='A1-ULTRA');

UPDATE product.catalog_publish_assets
SET model_code=CASE model_code WHEN 'FC1' THEN 'A1-ULTRA' WHEN 'FC2' THEN 'L1-PRO' WHEN 'L7' THEN 'A1' WHEN 'L8' THEN 'L1' END,
    updated_at=now()
WHERE model_code IN ('FC1','FC2','L7','L8');

UPDATE product.homepage_product_bindings
SET target_model_code=CASE target_model_code WHEN 'FC1' THEN 'A1-ULTRA' WHEN 'FC2' THEN 'L1-PRO' WHEN 'L7' THEN 'A1' WHEN 'L8' THEN 'L1' END,
    version=version+1,
    updated_at=now()
WHERE target_model_code IN ('FC1','FC2','L7','L8');

UPDATE product.catalog_publications
SET title_zh=regexp_replace(regexp_replace(regexp_replace(regexp_replace(title_zh,'\mFC1\M','A1 Ultra','g'),'\mFC2\M','L1 Pro','g'),'\mL7\M','A1','g'),'\mL8\M','L1','g'),
    title_de=regexp_replace(regexp_replace(regexp_replace(regexp_replace(title_de,'\mFC1\M','A1 Ultra','g'),'\mFC2\M','L1 Pro','g'),'\mL7\M','A1','g'),'\mL8\M','L1','g'),
    title_en=regexp_replace(regexp_replace(regexp_replace(regexp_replace(title_en,'\mFC1\M','A1 Ultra','g'),'\mFC2\M','L1 Pro','g'),'\mL7\M','A1','g'),'\mL8\M','L1','g'),
    version=version+1,
    updated_at=now()
WHERE title_zh ~ '\m(FC1|FC2|L7|L8)\M'
   OR title_de ~ '\m(FC1|FC2|L7|L8)\M'
   OR title_en ~ '\m(FC1|FC2|L7|L8)\M';

UPDATE product.models
SET code=CASE code
      WHEN 'FC1' THEN 'A1-ULTRA'
      WHEN 'FC2' THEN 'L1-PRO'
      WHEN 'L7' THEN 'A1'
      WHEN 'L8' THEN 'L1'
    END,
    name=CASE code
      WHEN 'FC1' THEN 'A1 Ultra'
      WHEN 'FC2' THEN 'L1 Pro'
      WHEN 'L7' THEN 'A1'
      WHEN 'L8' THEN 'L1'
    END,
    description=regexp_replace(regexp_replace(regexp_replace(regexp_replace(description,'\mFC1\M','A1 Ultra','g'),'\mFC2\M','L1 Pro','g'),'\mL7\M','A1','g'),'\mL8\M','L1','g'),
    version=version+1,
    updated_at=now()
WHERE code IN ('FC1','FC2','L7','L8');
