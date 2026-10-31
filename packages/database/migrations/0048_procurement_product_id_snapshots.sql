UPDATE procurement.purchase_order_snapshots p
SET snapshot=jsonb_set(p.snapshot,'{lines}',COALESCE((
  SELECT jsonb_agg(line.value || jsonb_build_object(
    'product_id',s.product_id::text,'sku_number',s.sku_number::text
  ) ORDER BY line.ordinality)
  FROM jsonb_array_elements(p.snapshot->'lines') WITH ORDINALITY AS line(value,ordinality)
  LEFT JOIN product.skus s ON s.id=NULLIF(line.value->>'sku_id','')::uuid
),'[]'::jsonb),true)
WHERE p.snapshot ? 'lines';

CREATE OR REPLACE FUNCTION procurement.capture_po_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE lines_json jsonb;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT COALESCE(jsonb_agg(
    to_jsonb(l) || jsonb_build_object(
      'product_id',s.product_id::text,'sku_number',s.sku_number::text
    ) ORDER BY l.line_no
  ),'[]'::jsonb)
  INTO lines_json
  FROM procurement.purchase_order_lines l
  LEFT JOIN product.skus s ON s.id=l.sku_id
  WHERE l.purchase_order_id=NEW.id;

  INSERT INTO procurement.purchase_order_snapshots(purchase_order_id,state,po_version,snapshot)
  VALUES(NEW.id,NEW.status,NEW.version,jsonb_build_object(
    'header',to_jsonb(NEW)-'created_by'-'updated_by','lines',lines_json
  ));
  RETURN NEW;
END;
$$;
