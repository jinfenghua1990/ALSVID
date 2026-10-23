-- Keep receipt lines bound to their purchase order and prevent over-receiving.
-- The PO row lock serializes concurrent receipt writes for the same PO.

CREATE OR REPLACE FUNCTION procurement.validate_receipt_line_po() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  receipt_po uuid;
  line_po uuid;
  receipt_kind text;
  po_status text;
  ordered_qty numeric(18,6);
  existing_qty numeric(18,6);
BEGIN
  SELECT purchase_order_id, kind
  INTO receipt_po, receipt_kind
  FROM procurement.receipts
  WHERE id = NEW.receipt_id;

  SELECT purchase_order_id, ordered_quantity
  INTO line_po, ordered_qty
  FROM procurement.purchase_order_lines
  WHERE id = NEW.purchase_order_line_id;

  IF receipt_po IS NULL THEN
    RAISE EXCEPTION 'Receipt not found' USING ERRCODE = '23503';
  END IF;
  IF line_po IS NULL THEN
    RAISE EXCEPTION 'Purchase order line not found' USING ERRCODE = '23503';
  END IF;
  IF receipt_po IS DISTINCT FROM line_po THEN
    RAISE EXCEPTION 'Receipt line must belong to the same purchase order' USING ERRCODE = '23514';
  END IF;

  -- Serialize writes even when a caller bypasses the application service.
  SELECT status
  INTO po_status
  FROM procurement.purchase_orders
  WHERE id = receipt_po
  FOR UPDATE;

  IF po_status NOT IN ('CONFIRMED', 'PARTIALLY_FULFILLED') THEN
    RAISE EXCEPTION 'Receipt/commitment requires a confirmed purchase order' USING ERRCODE = '23514';
  END IF;

  -- Purchase-order lines are immutable after issue, but read the limit again
  -- after acquiring the parent lock so this check remains safe under concurrency.
  SELECT ordered_quantity
  INTO ordered_qty
  FROM procurement.purchase_order_lines
  WHERE id = NEW.purchase_order_line_id;

  SELECT COALESCE(SUM(rl.quantity), 0)
  INTO existing_qty
  FROM procurement.receipt_lines rl
  JOIN procurement.receipts rh ON rh.id = rl.receipt_id
  WHERE rl.purchase_order_line_id = NEW.purchase_order_line_id
    AND rh.kind = receipt_kind
    AND (TG_OP <> 'UPDATE' OR rl.id IS DISTINCT FROM NEW.id);

  IF existing_qty + NEW.quantity > ordered_qty THEN
    IF receipt_kind = 'PHYSICAL_RECEIPT' THEN
      RAISE EXCEPTION 'Physical receipt quantity exceeds ordered quantity' USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'Factory commitment quantity exceeds ordered quantity' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- A receipt's type/order defines which quantity ledger it contributes to.
-- Do not allow reclassifying or moving a receipt after it has lines.
CREATE OR REPLACE FUNCTION procurement.protect_receipt_identity() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM procurement.receipt_lines WHERE receipt_id = OLD.id) THEN
      RAISE EXCEPTION 'Receipt with recorded lines cannot be deleted' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF (
    NEW.purchase_order_id IS DISTINCT FROM OLD.purchase_order_id
    OR NEW.kind IS DISTINCT FROM OLD.kind
  ) AND EXISTS (
    SELECT 1 FROM procurement.receipt_lines WHERE receipt_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Receipt purchase order and kind are immutable after lines are recorded'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER procurement_receipt_identity_guard
BEFORE UPDATE OR DELETE ON procurement.receipts
FOR EACH ROW EXECUTE FUNCTION procurement.protect_receipt_identity();
