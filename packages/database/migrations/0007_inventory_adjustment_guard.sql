CREATE OR REPLACE FUNCTION inventory.require_adjustment_reason() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.movement_type='ADJUSTMENT' AND length(trim(NEW.reason))=0 THEN
    RAISE EXCEPTION 'Adjustment reason is required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_adjustment_reason_guard
BEFORE INSERT ON inventory.movements
FOR EACH ROW EXECUTE FUNCTION inventory.require_adjustment_reason();
