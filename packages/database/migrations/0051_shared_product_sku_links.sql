-- Carry the stable ALSVID IDs through every existing SKU-backed business record.
ALTER TABLE product.variants ADD COLUMN product_id bigint;
UPDATE product.variants v SET product_id=m.product_id
FROM product.models m WHERE m.id=v.model_id;
ALTER TABLE product.variants
  ALTER COLUMN product_id SET NOT NULL,
  ADD CONSTRAINT product_variants_product_id_fk
    FOREIGN KEY(product_id) REFERENCES product.models(product_id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION product.sync_variant_product_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT m.product_id INTO NEW.product_id
  FROM product.models m WHERE m.id=NEW.model_id;
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'Variant model not found' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_variants_sync_product_id
BEFORE INSERT OR UPDATE ON product.variants
FOR EACH ROW EXECUTE FUNCTION product.sync_variant_product_id();

ALTER TABLE product.catalog_publications ADD COLUMN product_id bigint;
UPDATE product.catalog_publications p SET product_id=m.product_id
FROM product.models m WHERE m.id=p.model_id;
ALTER TABLE product.catalog_publications
  ALTER COLUMN product_id SET NOT NULL,
  ADD CONSTRAINT catalog_publications_product_id_fk
    FOREIGN KEY(product_id) REFERENCES product.models(product_id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION product.sync_publication_product_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT m.product_id INTO NEW.product_id
  FROM product.models m WHERE m.id=NEW.model_id;
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'Publication model not found' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER product_publications_sync_product_id
BEFORE INSERT OR UPDATE ON product.catalog_publications
FOR EACH ROW EXECUTE FUNCTION product.sync_publication_product_id();

ALTER TABLE engineering.boms ADD COLUMN product_id bigint;
UPDATE engineering.boms b SET product_id=m.product_id
FROM product.models m WHERE m.id=b.model_id;
ALTER TABLE engineering.boms
  ALTER COLUMN product_id SET NOT NULL,
  ADD CONSTRAINT engineering_boms_product_id_fk
    FOREIGN KEY(product_id) REFERENCES product.models(product_id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION engineering.sync_bom_product_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT m.product_id INTO NEW.product_id
  FROM product.models m WHERE m.id=NEW.model_id;
  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'BOM product model not found' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER engineering_boms_sync_product_id
BEFORE INSERT OR UPDATE ON engineering.boms
FOR EACH ROW EXECUTE FUNCTION engineering.sync_bom_product_id();

ALTER TABLE product.skus
  ADD CONSTRAINT product_skus_product_id_number_unique UNIQUE(product_id,sku_number);

ALTER TABLE commerce.storefront_order_lines
  ADD CONSTRAINT storefront_order_lines_internal_sku_pair_fk
    FOREIGN KEY(product_id_snapshot,sku_number_snapshot)
    REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE commerce.external_order_lines
  ADD CONSTRAINT external_order_lines_internal_sku_pair_fk
    FOREIGN KEY(product_id,sku_number)
    REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE commerce.sku_mappings
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE commerce.sku_mappings m SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=m.sku_id;
ALTER TABLE commerce.sku_mappings
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN sku_number SET NOT NULL,
  ADD CONSTRAINT commerce_sku_mappings_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE commerce.storefront_prices
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE commerce.storefront_prices p SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=p.sku_id;
ALTER TABLE commerce.storefront_prices
  ADD CONSTRAINT storefront_prices_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE inventory.movements
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE inventory.movements m SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=m.sku_id;
ALTER TABLE inventory.movements
  ADD CONSTRAINT inventory_movements_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE inventory.reservations
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE inventory.reservations r SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=r.sku_id;
ALTER TABLE inventory.reservations
  ADD CONSTRAINT inventory_reservations_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE logistics.shipment_cargo
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE logistics.shipment_cargo c SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=c.sku_id;
ALTER TABLE logistics.shipment_cargo
  ADD CONSTRAINT shipment_cargo_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE procurement.purchase_order_lines
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE procurement.purchase_order_lines p SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=p.sku_id;
ALTER TABLE procurement.purchase_order_lines
  ADD CONSTRAINT purchase_order_lines_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE procurement.quotation_lines
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE procurement.quotation_lines q SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=q.sku_id;
ALTER TABLE procurement.quotation_lines
  ADD CONSTRAINT quotation_lines_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

ALTER TABLE engineering.build_specs
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE engineering.build_specs b SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=b.sku_id;
ALTER TABLE engineering.build_specs
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN sku_number SET NOT NULL,
  ADD CONSTRAINT build_specs_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION product.sync_business_sku_ids()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sku_id IS NULL THEN
    NEW.product_id:=NULL;
    NEW.sku_number:=NULL;
    RETURN NEW;
  END IF;
  SELECT s.product_id,s.sku_number INTO NEW.product_id,NEW.sku_number
  FROM product.skus s WHERE s.id=NEW.sku_id;
  IF NEW.product_id IS NULL OR NEW.sku_number IS NULL THEN
    RAISE EXCEPTION 'Product SKU not found' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER commerce_sku_mappings_sync_internal_ids
BEFORE INSERT OR UPDATE ON commerce.sku_mappings
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER commerce_storefront_prices_sync_internal_ids
BEFORE INSERT OR UPDATE ON commerce.storefront_prices
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER inventory_movements_sync_internal_ids
BEFORE INSERT OR UPDATE ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER inventory_reservations_sync_internal_ids
BEFORE INSERT OR UPDATE ON inventory.reservations
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER logistics_shipment_cargo_sync_internal_ids
BEFORE INSERT OR UPDATE ON logistics.shipment_cargo
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER procurement_purchase_order_lines_sync_internal_ids
BEFORE INSERT OR UPDATE ON procurement.purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER procurement_quotation_lines_sync_internal_ids
BEFORE INSERT OR UPDATE ON procurement.quotation_lines
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();
CREATE TRIGGER engineering_build_specs_sync_internal_ids
BEFORE INSERT OR UPDATE ON engineering.build_specs
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();

ALTER TABLE finance.document_lines
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE finance.document_lines f SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=f.sku_id;
ALTER TABLE finance.document_lines
  ADD CONSTRAINT finance_document_lines_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;
CREATE TRIGGER finance_document_lines_sync_internal_ids
BEFORE INSERT OR UPDATE ON finance.document_lines
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();

ALTER TABLE warehouse.stocktake_counts
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE warehouse.stocktake_counts w SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=w.sku_id;
ALTER TABLE warehouse.stocktake_counts
  ADD CONSTRAINT stocktake_counts_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;
CREATE TRIGGER warehouse_stocktake_counts_sync_internal_ids
BEFORE INSERT OR UPDATE ON warehouse.stocktake_counts
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();

ALTER TABLE vehicle.vehicles
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE vehicle.vehicles v SET product_id=s.product_id,sku_number=s.sku_number
FROM product.skus s WHERE s.id=v.sku_id;
ALTER TABLE vehicle.vehicles
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN sku_number SET NOT NULL,
  ADD CONSTRAINT vehicles_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;
CREATE TRIGGER vehicle_vehicles_sync_internal_ids
BEFORE INSERT OR UPDATE ON vehicle.vehicles
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids();

ALTER TABLE production.production_orders
  ADD COLUMN product_id bigint,
  ADD COLUMN sku_number bigint;
UPDATE production.production_orders p
SET product_id=b.product_id,sku_number=b.sku_number
FROM engineering.build_specs b WHERE b.id=p.build_spec_id;
ALTER TABLE production.production_orders
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN sku_number SET NOT NULL,
  ADD CONSTRAINT production_orders_internal_sku_fk
    FOREIGN KEY(product_id,sku_number) REFERENCES product.skus(product_id,sku_number) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION product.sync_business_sku_ids_from_build_spec()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT b.product_id,b.sku_number INTO NEW.product_id,NEW.sku_number
  FROM engineering.build_specs b WHERE b.id=NEW.build_spec_id;
  IF NEW.product_id IS NULL OR NEW.sku_number IS NULL THEN
    RAISE EXCEPTION 'Build specification SKU not found' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER production_orders_sync_internal_ids
BEFORE INSERT OR UPDATE ON production.production_orders
FOR EACH ROW EXECUTE FUNCTION product.sync_business_sku_ids_from_build_spec();
