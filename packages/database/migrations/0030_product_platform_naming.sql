-- Keep the canonical technology platform names consistent with the ALSVID product taxonomy.
-- Platform labels are master data; this migration corrects the existing GT seed value without creating demo models.
UPDATE product.platforms
SET name = CASE code
      WHEN 'FC' THEN 'Folding Carbon'
      WHEN 'CT' THEN 'City Touring'
      WHEN 'FT' THEN 'Fat Tire'
      WHEN 'GT' THEN 'Gravel/Touring'
      ELSE name
    END,
    description = CASE code
      WHEN 'FC' THEN 'Carbon folding bicycle technology platform'
      WHEN 'CT' THEN 'Urban and city-touring bicycle technology platform'
      WHEN 'FT' THEN 'Fat-tire bicycle technology platform'
      WHEN 'GT' THEN 'Gravel and long-distance touring technology platform'
      ELSE description
    END,
    version = version + 1,
    updated_at = now()
WHERE code IN ('FC', 'CT', 'FT', 'GT')
  AND (
    name IS DISTINCT FROM CASE code
      WHEN 'FC' THEN 'Folding Carbon'
      WHEN 'CT' THEN 'City Touring'
      WHEN 'FT' THEN 'Fat Tire'
      WHEN 'GT' THEN 'Gravel/Touring'
      ELSE name
    END
    OR description IS DISTINCT FROM CASE code
      WHEN 'FC' THEN 'Carbon folding bicycle technology platform'
      WHEN 'CT' THEN 'Urban and city-touring bicycle technology platform'
      WHEN 'FT' THEN 'Fat-tire bicycle technology platform'
      WHEN 'GT' THEN 'Gravel and long-distance touring technology platform'
      ELSE description
    END
  );
