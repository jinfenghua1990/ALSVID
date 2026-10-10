import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Database } from '@alsvid/database';
import { FinanceConflictError, createFinanceService, type FinanceActor, type FinanceAuditPort } from './index.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const suffix = () => randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
const audit: FinanceAuditPort = { async record() {} };

async function actor(database: Database): Promise<FinanceActor> {
  const email = `finance-${suffix().toLowerCase()}@example.com`;
  const result = await database.query<{ id: string }>(
    `INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Finance Test','x') RETURNING id`,
    [email],
  );
  return {
    userId: result.rows[0]!.id,
    permissions: ['finance.read','finance.document.write','finance.document.post','finance.payment.write','finance.allocate','finance.reconcile','finance.landed_cost'],
  };
}

async function partner(database: Database, role?: 'SUPPLIER' | 'CUSTOMER'): Promise<string> {
  const result = await database.query<{ id: string }>(
    `INSERT INTO partners.partners(kind,display_name,country_code) VALUES ('ORGANIZATION',$1,'DE') RETURNING id`,
    [`Finance Partner ${suffix()}`],
  );
  if (role) await database.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,$2)`, [result.rows[0]!.id, role]);
  return result.rows[0]!.id;
}

async function createSku(database: Database): Promise<string> {
  const key = suffix();
  const platform = await database.query<{ id: string }>(`SELECT id FROM product.platforms WHERE code='FC'`);
  const model = await database.query<{ id: string }>(
    `INSERT INTO product.models(platform_id,code,name,status) VALUES ($1,$2,'Finance Model','ACTIVE') RETURNING id`,
    [platform.rows[0]!.id, `FM${key}`],
  );
  const variant = await database.query<{ id: string }>(
    `INSERT INTO product.variants(model_id,code,name,status) VALUES ($1,'BASE','Base','ACTIVE') RETURNING id`,
    [model.rows[0]!.id],
  );
  const sku = await database.query<{ id: string }>(
    `INSERT INTO product.skus(variant_id,sku,name,status) VALUES ($1,$2,'Finance SKU','ACTIVE') RETURNING id`,
    [variant.rows[0]!.id, `FSKU-${key}`],
  );
  return sku.rows[0]!.id;
}

async function shipmentCargo(database: Database, userId: string): Promise<{ shipmentId: string; cargoId: string }> {
  const key = suffix();
  const cnWarehouse = await database.query<{ id: string }>(
    `INSERT INTO warehouse.warehouses(code,name,country_code,created_by,updated_by) VALUES ($1,'Finance CN','CN',$2,$2) RETURNING id`,
    [`CN${key}`, userId],
  );
  const deWarehouse = await database.query<{ id: string }>(
    `INSERT INTO warehouse.warehouses(code,name,country_code,created_by,updated_by) VALUES ($1,'Finance DE','DE',$2,$2) RETURNING id`,
    [`DE${key}`, userId],
  );
  const cnLocation = await database.query<{ id: string }>(
    `INSERT INTO warehouse.locations(warehouse_id,code,name,location_type,created_by,updated_by) VALUES ($1,'FG','Finished Goods','STORAGE',$2,$2) RETURNING id`,
    [cnWarehouse.rows[0]!.id, userId],
  );
  const deLocation = await database.query<{ id: string }>(
    `INSERT INTO warehouse.locations(warehouse_id,code,name,location_type,created_by,updated_by) VALUES ($1,'RCV','Receiving','RECEIVING',$2,$2) RETURNING id`,
    [deWarehouse.rows[0]!.id, userId],
  );
  const skuId = await createSku(database);
  await database.query(
    `INSERT INTO inventory.movements(movement_type,item_kind,sku_id,quantity,unit,destination_location_id,reference_type,reason,idempotency_key,created_by) VALUES ('RECEIPT','SKU',$1,1,'EA',$2,'FINANCE_TEST','Stock required before logistics reservation',$3,$4)`,
    [skuId, cnLocation.rows[0]!.id, `finance-receipt-${suffix()}`, userId],
  );
  const shipment = await database.query<{ id: string }>(
    `INSERT INTO logistics.shipments(route_type,origin_location_id,destination_location_id,created_by,updated_by) VALUES ('FACTORY_TO_GERMANY_WAREHOUSE',$1,$2,$3,$3) RETURNING id`,
    [cnLocation.rows[0]!.id, deLocation.rows[0]!.id, userId],
  );
  const reservation = await database.query<{ id: string }>(
    `INSERT INTO inventory.reservations(item_kind,sku_id,location_id,quantity,unit,reference_type,reference_id,note,created_by,updated_by) VALUES ('SKU',$1,$2,1,'EA','SHIPMENT',$3,'Finance landed cost test',$4,$4) RETURNING id`,
    [skuId, cnLocation.rows[0]!.id, shipment.rows[0]!.id, userId],
  );
  const cargo = await database.query<{ id: string }>(
    `INSERT INTO logistics.shipment_cargo(shipment_id,item_kind,sku_id,quantity,unit,reservation_id,created_by) VALUES ($1,'SKU',$2,1,'EA',$3,$4) RETURNING id`,
    [shipment.rows[0]!.id, skuId, reservation.rows[0]!.id, userId],
  );
  return { shipmentId: shipment.rows[0]!.id, cargoId: cargo.rows[0]!.id };
}

test('posted supplier invoice creates immutable AP obligation and allocations derive settlement state', { skip: !hasDatabase }, async () => {
  const database = new Database();
  try {
    const financeActor = await actor(database);
    const service = createFinanceService(database, audit);
    const supplier = await partner(database, 'SUPPLIER');
    const document = await service.createDocument(financeActor, {
      documentType: 'SUPPLIER_INVOICE', partnerId: supplier, externalReference: `INV-${suffix()}`, currency: 'EUR', issueDate: '2026-10-10', dueDate: '2026-11-10',
      lines: [{ category: 'GOODS', netAmount: '1000', taxAmount: '190', description: 'Bicycle goods' }],
    });
    assert.equal(Number(document.total_amount), 1190);
    const verified = await service.verifyDocument(financeActor, document.id, document.version);
    const posted = await service.postDocument(financeActor, document.id, verified.version);
    assert.ok(posted.obligation);
    assert.equal(posted.obligation.direction, 'AP');
    assert.equal(Number(posted.obligation.original_amount), 1190);
    assert.equal(new Date(posted.obligation.due_date).toISOString().slice(0, 10), '2026-11-10');
    await assert.rejects(database.query(`UPDATE finance.documents SET note='mutated' WHERE id=$1`, [document.id]), /immutable/);

    const paymentA = await service.createPayment(financeActor, { direction: 'OUTBOUND', partnerId: supplier, currency: 'EUR', amount: '500', valueDate: '2026-10-15', idempotencyKey: `pay-${suffix()}` });
    await service.allocatePayment(financeActor, { paymentId: paymentA.id, obligationId: posted.obligation.id, paymentAmount: '500', obligationAmount: '500' });
    let obligation = await database.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`, [posted.obligation.id]);
    assert.equal(obligation.rows[0].settlement_status, 'PARTIALLY_SETTLED');
    assert.equal(Number(obligation.rows[0].outstanding_amount), 690);

    const paymentB = await service.createPayment(financeActor, { direction: 'OUTBOUND', partnerId: supplier, currency: 'EUR', amount: '690', valueDate: '2026-10-20', idempotencyKey: `pay-${suffix()}` });
    const allocationB = await service.allocatePayment(financeActor, { paymentId: paymentB.id, obligationId: posted.obligation.id, paymentAmount: '690', obligationAmount: '690' });
    obligation = await database.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`, [posted.obligation.id]);
    assert.equal(obligation.rows[0].settlement_status, 'SETTLED');
    assert.equal(Number(obligation.rows[0].outstanding_amount), 0);

    await assert.rejects(service.reversePayment(financeActor, paymentA.id, 'wrong payment'), FinanceConflictError);
    await service.reverseAllocation(financeActor, allocationB.id, 'Allocation correction');
    obligation = await database.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`, [posted.obligation.id]);
    assert.equal(Number(obligation.rows[0].outstanding_amount), 690);
  } finally { await database.close(); }
});

test('concurrent allocations cannot settle the same final obligation balance twice', { skip: !hasDatabase }, async () => {
  const databaseA = new Database();
  const databaseB = new Database();
  try {
    const financeActor = await actor(databaseA);
    const serviceA = createFinanceService(databaseA, audit);
    const serviceB = createFinanceService(databaseB, audit);
    const customer = await partner(databaseA, 'CUSTOMER');
    const obligation = await serviceA.createObligation(financeActor, { direction: 'AR', partnerId: customer, currency: 'EUR', amount: '100', dueDate: '2026-10-31' });
    const paymentA = await serviceA.createPayment(financeActor, { direction: 'INBOUND', partnerId: customer, currency: 'EUR', amount: '100', valueDate: '2026-10-12', idempotencyKey: `race-${suffix()}` });
    const paymentB = await serviceA.createPayment(financeActor, { direction: 'INBOUND', partnerId: customer, currency: 'EUR', amount: '100', valueDate: '2026-10-12', idempotencyKey: `race-${suffix()}` });
    const results = await Promise.allSettled([
      serviceA.allocatePayment(financeActor, { paymentId: paymentA.id, obligationId: obligation.id, paymentAmount: '100', obligationAmount: '100' }),
      serviceB.allocatePayment(financeActor, { paymentId: paymentB.id, obligationId: obligation.id, paymentAmount: '100', obligationAmount: '100' }),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    const view = await databaseA.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`, [obligation.id]);
    assert.equal(Number(view.rows[0].allocated_amount), 100);
    assert.equal(view.rows[0].settlement_status, 'SETTLED');
  } finally { await databaseA.close(); await databaseB.close(); }
});

test('cross-currency allocation requires explicit compatible FX evidence', { skip: !hasDatabase }, async () => {
  const database = new Database();
  try {
    const financeActor = await actor(database);
    const service = createFinanceService(database, audit);
    const customer = await partner(database, 'CUSTOMER');
    const obligation = await service.createObligation(financeActor, { direction: 'AR', partnerId: customer, currency: 'EUR', amount: '90' });
    const payment = await service.createPayment(financeActor, { direction: 'INBOUND', partnerId: customer, currency: 'USD', amount: '100', valueDate: '2026-10-12', idempotencyKey: `fx-${suffix()}` });
    await assert.rejects(service.allocatePayment(financeActor, { paymentId: payment.id, obligationId: obligation.id, paymentAmount: '100', obligationAmount: '90' }), FinanceConflictError);
    const rate = await service.createFxRate(financeActor, { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: '0.9', effectiveAt: '2026-10-12T00:00:00Z', source: 'MANUAL_TEST' });
    await service.allocatePayment(financeActor, { paymentId: payment.id, obligationId: obligation.id, paymentAmount: '100', obligationAmount: '90', fxRateId: rate.id });
    const view = await database.query<any>(`SELECT * FROM finance.v_obligations WHERE id=$1`, [obligation.id]);
    assert.equal(view.rows[0].settlement_status, 'SETTLED');
  } finally { await database.close(); }
});

test('landed cost stays separate from Logistics and requires full capitalizable allocation before finalization', { skip: !hasDatabase }, async () => {
  const database = new Database();
  try {
    const financeActor = await actor(database);
    const service = createFinanceService(database, audit);
    const shipment = await shipmentCargo(database, financeActor.userId);
    const batch = await service.createLandedCostBatch(financeActor, { shipmentId: shipment.shipmentId, currency: 'EUR', allocationBasis: 'QUANTITY' });
    const freight = await service.addLandedCostComponent(financeActor, batch.id, { category: 'FREIGHT', amount: '100', currency: 'EUR', batchCurrencyAmount: '100', capitalizable: true });
    const vat = await service.addLandedCostComponent(financeActor, batch.id, { category: 'IMPORT_VAT', amount: '19', currency: 'EUR', batchCurrencyAmount: '19', capitalizable: false });
    await assert.rejects(service.finalizeLandedCostBatch(financeActor, batch.id), FinanceConflictError);
    await service.allocateLandedCost(financeActor, freight.id, { cargoId: shipment.cargoId, allocatedAmount: '100', basisValue: '1' });
    const finalized = await service.finalizeLandedCostBatch(financeActor, batch.id);
    assert.equal(finalized.status, 'FINALIZED');
    const view = await database.query<any>(`SELECT * FROM finance.v_landed_cost_by_cargo WHERE shipment_id=$1 AND cargo_id=$2`, [shipment.shipmentId, shipment.cargoId]);
    assert.equal(Number(view.rows[0].capitalizable_cost), 100);
    assert.equal(view.rows[0].noncapitalizable_cost, null);
    await assert.rejects(database.query(`UPDATE finance.landed_cost_components SET note='mutated' WHERE id=$1`, [freight.id]), /immutable/);
    await assert.rejects(database.query(`DELETE FROM finance.landed_cost_batches WHERE id=$1`, [batch.id]), /cannot be deleted/);
    assert.equal(vat.capitalizable, false);
  } finally { await database.close(); }
});
