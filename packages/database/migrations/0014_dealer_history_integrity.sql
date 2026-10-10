DROP TRIGGER IF EXISTS dealer_status_history ON dealer.dealers;
DROP FUNCTION IF EXISTS dealer.capture_status();

CREATE OR REPLACE FUNCTION dealer.reject_status_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Dealer status history is append-only';
END;
$$;
CREATE TRIGGER dealer_status_history_no_mutation
BEFORE UPDATE OR DELETE ON dealer.status_history
FOR EACH ROW EXECUTE FUNCTION dealer.reject_status_history_mutation();
