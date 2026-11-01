import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';

const hasDatabase = Boolean(process.env.DATABASE_URL);

async function createPartner(db: Database, withSupplierRole: boolean): Promise<string> {
  const partner = await db.query<{ id: string }>(
    `INSERT INTO partners.partners(kind,display_name) VALUES ('ORGANIZATION',$1) RETURNING id`,
    [`Proc Test ${randomUUID()}`],
  );
  if (withSupplierRole) {
    await db.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,'SUPPLIER')`, [partner.rows[0]!.id]);
  }
  return partner.rows[0]!.id;
}

async function createPart(db: Database): Promise<string> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const part = await db.query<{ id: string }>(
    `INSERT INTO engineering.parts(part_number,name) VALUES ($1,'Proc Test Part') RETURNING id`,
    [`PRC${suffix}`],
  );
  return part.rows[0]!.id;
}

test('procurement rejects Partners without SUPPLIER/FACTORY role and invalid PO transitions', { skip: !hasDatabase }, async () => {
  const db = new Database();
  try {
    const invalidPartner = await createPartner(db, false);
    await assert.rejects(
      db.query(`INSERT INTO procurement.purchase_orders(supplier_partner_id,currency) VALUES ($1,'EUR')`, [invalidPartner]),
      /SUPPLIER or FACTORY/,
    );

    const supplier = await createPartner(db, true);
    const po = await db.query<{ id: string }>(
      `INSERT INTO procurement.purchase_orders(supplier_partner_id,currency) VALUES ($1,'EUR') RETURNING id`,
      [supplier],
    );
    await assert.rejects(
      db.query(`UPDATE procurement.purchase_orders SET status='CONFIRMED' WHERE id=$1`, [po.rows[0]!.id]),
      /Invalid purchase order transition/,
    );
  } finally {
    await db.close();
  }
});

test('draft PO lines can be edited/deleted, issued PO lines are immutable, and state snapshots are automatic', { skip: !hasDatabase }, async () => {
  const db = new Database();
  try {
    const supplier = await createPartner(db, true);
    const partId = await createPart(db);
    const platform = await db.query<{id:string}>(`SELECT id FROM product.platforms WHERE code='FC' LIMIT 1`);
    const model = await db.query<{id:string}>(`INSERT INTO product.models(platform_id,code,name)
      VALUES($1,$2,'Procurement SKU Test') RETURNING id`,[platform.rows[0]!.id,`PROC-${randomUUID().replaceAll('-','').slice(0,10).toUpperCase()}`]);
    const variant = await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name)
      VALUES($1,'DEFAULT','Default') RETURNING id`,[model.rows[0]!.id]);
    const sku = await db.query<{id:string;sku_number:string;product_id:string}>(`INSERT INTO product.skus(variant_id,sku,name)
      VALUES($1,$2,'Procurement SKU Test') RETURNING id,sku_number::text,product_id::text`,
      [variant.rows[0]!.id,`PROC-SKU-${randomUUID().replaceAll('-','').slice(0,10).toUpperCase()}`]);
    const po = await db.query<{ id: string }>(
      `INSERT INTO procurement.purchase_orders(supplier_partner_id,currency) VALUES ($1,'EUR') RETURNING id`,
      [supplier],
    );

    const disposable = await db.query<{ id: string }>(
      `INSERT INTO procurement.purchase_order_lines(purchase_order_id,line_no,item_type,part_id,ordered_quantity,unit_price)
       VALUES ($1,5,'PART',$2,1,9.95) RETURNING id`,
      [po.rows[0]!.id, partId],
    );
    await db.query(`DELETE FROM procurement.purchase_order_lines WHERE id=$1`, [disposable.rows[0]!.id]);
    const deleted = await db.query<{ count: string }>(`SELECT count(*)::text AS count FROM procurement.purchase_order_lines WHERE id=$1`, [disposable.rows[0]!.id]);
    assert.equal(deleted.rows[0]!.count, '0');

    const line = await db.query<{ id: string }>(
      `INSERT INTO procurement.purchase_order_lines(purchase_order_id,line_no,item_type,part_id,ordered_quantity,unit_price)
       VALUES ($1,10,'PART',$2,2,19.95) RETURNING id`,
      [po.rows[0]!.id, partId],
    );
    await db.query(`INSERT INTO procurement.purchase_order_lines
      (purchase_order_id,line_no,item_type,sku_id,ordered_quantity,unit_price)
      VALUES($1,20,'SKU',$2,1,29.95)`,[po.rows[0]!.id,sku.rows[0]!.id]);
    await db.query(`UPDATE procurement.purchase_orders SET status='ISSUED',issued_at=now(),version=version+1 WHERE id=$1`, [po.rows[0]!.id]);
    await assert.rejects(
      db.query(`UPDATE procurement.purchase_order_lines SET ordered_quantity=3 WHERE id=$1`, [line.rows[0]!.id]),
      /immutable/,
    );
    const snapshots = await db.query<{ state: string; snapshot: {lines:Array<{sku_id:string|null;product_id:string|null;sku_number:string|null}>} }>(
      `SELECT state,snapshot FROM procurement.purchase_order_snapshots WHERE purchase_order_id=$1`,
      [po.rows[0]!.id],
    );
    assert.equal(snapshots.rows.length, 1);
    assert.equal(snapshots.rows[0]!.state, 'ISSUED');
    assert.ok(snapshots.rows[0]!.snapshot);
    assert.ok(snapshots.rows[0]!.snapshot.lines.some(item=>item.sku_id===sku.rows[0]!.id&&
      item.product_id===sku.rows[0]!.product_id&&item.sku_number===sku.rows[0]!.sku_number));
    await db.query("UPDATE product.skus SET status='RETIRED' WHERE id=$1",[sku.rows[0]!.id]);
    await db.query("UPDATE product.variants SET status='RETIRED' WHERE id=$1",[variant.rows[0]!.id]);
    await db.query("UPDATE product.models SET status='RETIRED',version=version+1,updated_at=now() WHERE id=$1",[model.rows[0]!.id]);
  } finally {
    await db.close();
  }
});


test('receipt lines stay within their PO, and cumulative physical receipts or commitments cannot exceed ordered quantity', { skip: !hasDatabase }, async () => {
  const db = new Database();
  try {
    const supplier = await createPartner(db, true);
    const partId = await createPart(db);

    async function createConfirmedPo() {
      const po = await db.query<{ id: string }>(
        `INSERT INTO procurement.purchase_orders(supplier_partner_id,currency)
         VALUES ($1,'EUR') RETURNING id`,
        [supplier],
      );
      const line = await db.query<{ id: string }>(
        `INSERT INTO procurement.purchase_order_lines(
           purchase_order_id,line_no,item_type,part_id,ordered_quantity,unit_price
         ) VALUES ($1,10,'PART',$2,2,9.95) RETURNING id`,
        [po.rows[0]!.id, partId],
      );
      await db.query(
        `UPDATE procurement.purchase_orders
         SET status='ISSUED',issued_at=now(),version=version+1 WHERE id=$1`,
        [po.rows[0]!.id],
      );
      await db.query(
        `UPDATE procurement.purchase_orders
         SET status='CONFIRMED',confirmed_at=now(),version=version+1 WHERE id=$1`,
        [po.rows[0]!.id],
      );
      return { id: po.rows[0]!.id, lineId: line.rows[0]!.id };
    }

    async function createReceipt(poId: string, kind: 'PHYSICAL_RECEIPT' | 'FACTORY_COMMITMENT') {
      const receipt = await db.query<{ id: string }>(
        `INSERT INTO procurement.receipts(purchase_order_id,kind,occurred_on)
         VALUES ($1,$2,CURRENT_DATE) RETURNING id`,
        [poId, kind],
      );
      return receipt.rows[0]!.id;
    }

    async function insertReceiptLine(receiptId: string, lineId: string, quantity: string) {
      return db.query(
        `INSERT INTO procurement.receipt_lines(receipt_id,purchase_order_line_id,quantity,unit)
         VALUES ($1,$2,$3,'EA')`,
        [receiptId, lineId, quantity],
      );
    }

    const first = await createConfirmedPo();
    const second = await createConfirmedPo();

    const physicalReceipt1 = await createReceipt(first.id, 'PHYSICAL_RECEIPT');
    await insertReceiptLine(physicalReceipt1, first.lineId, '1.5');
    const physicalReceipt2 = await createReceipt(first.id, 'PHYSICAL_RECEIPT');
    await insertReceiptLine(physicalReceipt2, first.lineId, '0.5');

    const physicalOverage = await createReceipt(first.id, 'PHYSICAL_RECEIPT');
    await assert.rejects(
      insertReceiptLine(physicalOverage, first.lineId, '0.1'),
      /Physical receipt quantity exceeds ordered quantity/,
    );

    const commitment1 = await createReceipt(first.id, 'FACTORY_COMMITMENT');
    await insertReceiptLine(commitment1, first.lineId, '1.5');
    const commitment2 = await createReceipt(first.id, 'FACTORY_COMMITMENT');
    await insertReceiptLine(commitment2, first.lineId, '0.5');
    const commitmentOverage = await createReceipt(first.id, 'FACTORY_COMMITMENT');
    await assert.rejects(
      insertReceiptLine(commitmentOverage, first.lineId, '0.1'),
      /Factory commitment quantity exceeds ordered quantity/,
    );

    const wrongPoReceipt = await createReceipt(first.id, 'PHYSICAL_RECEIPT');
    await assert.rejects(
      insertReceiptLine(wrongPoReceipt, second.lineId, '0.1'),
      /Receipt line must belong to the same purchase order/,
    );

    await assert.rejects(
      db.query(`UPDATE procurement.receipts SET kind='FACTORY_COMMITMENT' WHERE id=$1`, [physicalReceipt1]),
      /Receipt purchase order and kind are immutable after lines are recorded/,
    );
    await assert.rejects(
      db.query(`DELETE FROM procurement.receipts WHERE id=$1`, [physicalReceipt1]),
      /Receipt with recorded lines cannot be deleted/,
    );

    const totals = await db.query<{ kind: string; quantity: string }>(
      `SELECT rh.kind, sum(rl.quantity)::text AS quantity
       FROM procurement.receipt_lines rl
       JOIN procurement.receipts rh ON rh.id=rl.receipt_id
       WHERE rl.purchase_order_line_id=$1
       GROUP BY rh.kind ORDER BY rh.kind`,
      [first.lineId],
    );
    assert.deepEqual(totals.rows, [
      { kind: 'FACTORY_COMMITMENT', quantity: '2.000000' },
      { kind: 'PHYSICAL_RECEIPT', quantity: '2.000000' },
    ]);
  } finally {
    await db.close();
  }
});
