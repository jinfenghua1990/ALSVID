CREATE OR REPLACE FUNCTION production.validate_deviation_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  unit_status text;
  expected_in_bom boolean;
BEGIN
  SELECT u.status,
         EXISTS (
           SELECT 1
           FROM production.production_units u2
           JOIN production.production_orders po ON po.id = u2.production_order_id
           JOIN engineering.build_specs bs ON bs.id = po.build_spec_id
           JOIN engineering.bom_lines bl ON bl.revision_id = bs.bom_revision_id
           WHERE u2.id = NEW.production_unit_id
             AND bl.part_id = NEW.expected_part_id
         )
  INTO unit_status, expected_in_bom
  FROM production.production_units u
  WHERE u.id = NEW.production_unit_id;

  IF unit_status IS NULL THEN
    RAISE EXCEPTION 'Production unit does not exist';
  END IF;

  IF unit_status = 'QC_PASSED' THEN
    RAISE EXCEPTION 'As-built deviations cannot be added after QC PASS';
  END IF;

  IF expected_in_bom IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Expected part is not present in the released Build Specification BOM';
  END IF;

  IF NEW.expected_part_id = NEW.actual_part_id THEN
    RAISE EXCEPTION 'As-built deviation must change the actual part';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER production_deviation_insert_guard
BEFORE INSERT ON production.as_built_deviations
FOR EACH ROW EXECUTE FUNCTION production.validate_deviation_insert();

CREATE OR REPLACE FUNCTION vehicle.reject_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Vehicle identity cannot be deleted; use a privileged correction workflow';
END;
$$;

CREATE TRIGGER vehicle_identity_no_delete
BEFORE DELETE ON vehicle.vehicles
FOR EACH ROW EXECUTE FUNCTION vehicle.reject_delete();
