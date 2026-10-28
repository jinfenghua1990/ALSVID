import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';

test('real PostgreSQL supplier gifts preserve zero-cost PO, issued snapshots and physical receipt trace',
 {skip:!process.env.DATABASE_URL},async()=>{
 const db=new Database();
 try {
  const supplier=(await db.query<{id:string}>(
    "INSERT INTO partners.partners(kind,display_name) VALUES('ORGANIZATION',$1) RETURNING id",
    ['Gift Partner '+randomUUID()])).rows[0]!;
  await db.query("INSERT INTO partners.roles(partner_id,role) VALUES($1,'SUPPLIER')",[supplier.id]);
  const part=(await db.query<{id:string}>(
    "INSERT INTO engineering.parts(part_number,name) VALUES($1,'Gift Test Part') RETURNING id",
    ['GF'+randomUUID().replaceAll('-','').slice(0,12).toUpperCase()])).rows[0]!;
  const po=(await db.query<{id:string}>(
    "INSERT INTO procurement.purchase_orders(supplier_partner_id,currency) VALUES($1,'EUR') RETURNING id",
    [supplier.id])).rows[0]!;
  await db.query(`INSERT INTO procurement.purchase_order_lines
    (purchase_order_id,line_no,item_type,part_id,ordered_quantity,unit_price,line_kind)
    VALUES ($1,10,'PART',$2,2,15,'PURCHASE'),($1,20,'PART',$2,1,0,'GIFT')`,
    [po.id,part.id]);
  await assert.rejects(()=>db.query(`INSERT INTO procurement.purchase_order_lines
    (purchase_order_id,line_no,item_type,part_id,ordered_quantity,unit_price,line_kind)
    VALUES($1,30,'PART',$2,1,1,'GIFT')`,[po.id,part.id]),/procurement_gift_zero_price_chk/);
  const lines=await db.query<{id:string;line_kind:string;unit_price:string}>(`
    SELECT id,line_kind,unit_price::text FROM procurement.purchase_order_lines
    WHERE purchase_order_id=$1 ORDER BY line_no`,[po.id]);
  assert.deepEqual(lines.rows.map(x=>[x.line_kind,Number(x.unit_price)]),[['PURCHASE',15],['GIFT',0]]);
  const total=await db.query<{total:string}>(
    'SELECT sum(ordered_quantity*unit_price)::text total FROM procurement.purchase_order_lines WHERE purchase_order_id=$1',
    [po.id]);
  assert.equal(Number(total.rows[0]?.total),30);
  await db.query("UPDATE procurement.purchase_orders SET status='ISSUED',issued_at=now(),version=version+1 WHERE id=$1",[po.id]);
  await db.query("UPDATE procurement.purchase_orders SET status='CONFIRMED',confirmed_at=now(),version=version+1 WHERE id=$1",[po.id]);
  const confirmation=(await db.query<{id:string}>(
    'INSERT INTO procurement.supplier_confirmations(purchase_order_id) VALUES($1) RETURNING id',
    [po.id])).rows[0]!;
  await db.query(
    'INSERT INTO procurement.supplier_confirmation_lines(confirmation_id,purchase_order_line_id,confirmed_quantity) VALUES($1,$2,1)',
    [confirmation.id,lines.rows[1]!.id]);
  const receipt=(await db.query<{id:string}>(
    "INSERT INTO procurement.receipts(purchase_order_id,kind,occurred_on) VALUES($1,'PHYSICAL_RECEIPT',CURRENT_DATE) RETURNING id",
    [po.id])).rows[0]!;
  await db.query(
    "INSERT INTO procurement.receipt_lines(receipt_id,purchase_order_line_id,quantity,unit) VALUES($1,$2,1,'EA')",
    [receipt.id,lines.rows[1]!.id]);
  const recorded=await db.query<{line_kind:string;quantity:string}>(`
    SELECT l.line_kind,rl.quantity::text FROM procurement.receipt_lines rl
    JOIN procurement.purchase_order_lines l ON l.id=rl.purchase_order_line_id
    WHERE rl.receipt_id=$1`,[receipt.id]);
  assert.equal(recorded.rows[0]!.line_kind,'GIFT');assert.equal(Number(recorded.rows[0]!.quantity),1);
  const snap=await db.query<{snapshot:{lines:Array<{line_kind:string}>}}>(
    "SELECT snapshot FROM procurement.purchase_order_snapshots WHERE purchase_order_id=$1 AND state='ISSUED'",[po.id]);
  assert.ok(snap.rows[0]!.snapshot.lines.some(x=>x.line_kind==='GIFT'));
  await assert.rejects(()=>db.query(
    "UPDATE procurement.purchase_order_lines SET line_kind='PURCHASE' WHERE id=$1",[lines.rows[1]!.id]),
    /immutable/);
 }finally { await db.close(); }
});
