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
    await db.query(`UPDATE procurement.purchase_orders SET status='ISSUED',issued_at=now(),version=version+1 WHERE id=$1`, [po.rows[0]!.id]);
    await assert.rejects(
      db.query(`UPDATE procurement.purchase_order_lines SET ordered_quantity=3 WHERE id=$1`, [line.rows[0]!.id]),
      /immutable/,
    );
    const snapshots = await db.query<{ state: string; snapshot: unknown }>(
      `SELECT state,snapshot FROM procurement.purchase_order_snapshots WHERE purchase_order_id=$1`,
      [po.rows[0]!.id],
    );
    assert.equal(snapshots.rows.length, 1);
    assert.equal(snapshots.rows[0]!.state, 'ISSUED');
    assert.ok(snapshots.rows[0]!.snapshot);
  } finally {
    await db.close();
  }
});
