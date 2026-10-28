-- Supplier gifts remain existing procurement lines and use the same confirmation/receipt evidence.
-- Old PO rows are PURCHASE; no synthetic receipts or inventory adjustments.
ALTER TABLE procurement.purchase_order_lines
 ADD COLUMN line_kind text NOT NULL DEFAULT 'PURCHASE'
 CONSTRAINT procurement_po_line_kind_chk CHECK(line_kind IN ('PURCHASE','GIFT'));
ALTER TABLE procurement.purchase_order_lines
 ADD CONSTRAINT procurement_gift_zero_price_chk CHECK(line_kind<>'GIFT' OR unit_price=0);
COMMENT ON COLUMN procurement.purchase_order_lines.line_kind IS
 'GIFT: supplier gift, zero purchase value, fully received through existing PO workflow.';
