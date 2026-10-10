import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Database } from '@alsvid/database';
import {
  VehicleConflictError,
  createVehicleService,
  type VehicleActor,
  type VehicleAuditPort,
} from './index.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const suffix = () => randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
const audit: VehicleAuditPort = { async record() {} };

async function actor(db: Database): Promise<VehicleActor> {
  const user = await db.query<{ id: string }>(
    `INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Vehicle 360 Test','x') RETURNING id`,
    [`vehicle360-${suffix().toLowerCase()}@example.com`],
  );
  return {
    userId: user.rows[0]!.id,
    permissions: ['vehicle.read','vehicle.birth','vehicle.handover','vehicle.ownership.write','vehicle.garage.read'],
  };
}

async function partner(db: Database, role: 'FACTORY' | 'DEALER' | 'CUSTOMER'): Promise<string> {
  const row = await db.query<{ id: string }>(
    `INSERT INTO partners.partners(kind,display_name,country_code) VALUES ('ORGANIZATION',$1,'DE') RETURNING id`,
    [`${role} ${suffix()}`],
  );
  await db.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,$2)`, [row.rows[0]!.id, role]);
  return row.rows[0]!.id;
}

async function buildSpec(db: Database): Promise<{ specId: string; skuId: string }> {
  const code = suffix();
  const platform = await db.query<{ id: string }>(`SELECT id FROM product.platforms WHERE code='FC'`);
  const model = await db.query<{ id: string }>(
    `INSERT INTO product.models(platform_id,code,name) VALUES ($1,$2,'Vehicle 360 model') RETURNING id`,
    [platform.rows[0]!.id, `VM${code}`],
  );
  const variant = await db.query<{ id: string }>(
    `INSERT INTO product.variants(model_id,code,name) VALUES ($1,'BASE','Base') RETURNING id`,
    [model.rows[0]!.id],
  );
  const sku = await db.query<{ id: string }>(
    `INSERT INTO product.skus(variant_id,sku,name) VALUES ($1,$2,'Vehicle 360 SKU') RETURNING id`,
    [variant.rows[0]!.id, `VSKU-${code}`],
  );
  const bom = await db.query<{ id: string }>(
    `INSERT INTO engineering.boms(model_id,code,name) VALUES ($1,$2,'Vehicle 360 BOM') RETURNING id`,
    [model.rows[0]!.id, `VB${code}`],
  );
  const revision = await db.query<{ id: string }>(
    `INSERT INTO engineering.bom_revisions(bom_id,revision_code) VALUES ($1,'A') RETURNING id`,
    [bom.rows[0]!.id],
  );
  await db.query(`UPDATE engineering.bom_revisions SET status='RELEASED',released_at=now() WHERE id=$1`, [revision.rows[0]!.id]);
  const spec = await db.query<{ id: string }>(
    `INSERT INTO engineering.build_specs(code,sku_id,bom_revision_id,status,released_at) VALUES ($1,$2,$3,'RELEASED',now()) RETURNING id`,
    [`VBS${code}`, sku.rows[0]!.id, revision.rows[0]!.id],
  );
  return { specId: spec.rows[0]!.id, skuId: sku.rows[0]!.id };
}

async function bornVehicle(db: Database, vehicleActor: VehicleActor): Promise<{ id: string; frameNumber: string; vehicleCode: string }> {
  const factoryId = await partner(db, 'FACTORY');
  const spec = await buildSpec(db);
  const order = await db.query<{ id: string }>(
    `INSERT INTO production.production_orders(build_spec_id,factory_partner_id,planned_quantity,status,released_at) VALUES ($1,$2,1,'RELEASED',now()) RETURNING id`,
    [spec.specId, factoryId],
  );
  const unit = await db.query<{ id: string }>(
    `INSERT INTO production.production_units(production_order_id,unit_no,status) VALUES ($1,1,'QC_PENDING') RETURNING id`,
    [order.rows[0]!.id],
  );
  await db.query(
    `INSERT INTO production.qc_inspections(production_unit_id,result,checklist_code,inspected_by) VALUES ($1,'PASS','FC-FINAL',$2)`,
    [unit.rows[0]!.id, vehicleActor.userId],
  );
  await db.query(`UPDATE production.production_units SET status='QC_PASSED' WHERE id=$1`, [unit.rows[0]!.id]);
  const service = createVehicleService(db, audit);
  const frameNumber = `FRAME-${suffix()}`;
  const vehicle = await service.birth(vehicleActor, unit.rows[0]!.id, frameNumber);
  return { id: vehicle.id, frameNumber, vehicleCode: vehicle.vehicle_code };
}

test('Vehicle birth seeds lifecycle and customer handover creates append-only ownership evidence', { skip: !hasDatabase }, async () => {
  const db = new Database();
  try {
    const vehicleActor = await actor(db);
    const service = createVehicleService(db, audit);
    const vehicle = await bornVehicle(db, vehicleActor);
    const dealerId = await partner(db, 'DEALER');
    const customerId = await partner(db, 'CUSTOMER');

    const born = await db.query<any>(`SELECT * FROM vehicle.lifecycle_events WHERE vehicle_id=$1 ORDER BY sequence_no`, [vehicle.id]);
    assert.equal(born.rows.length, 1);
    assert.equal(born.rows[0].state, 'BORN');

    const lookupByFrame = await service.lookup(vehicleActor, vehicle.frameNumber);
    assert.equal(lookupByFrame.id, vehicle.id);
    const lookupByCode = await service.lookup(vehicleActor, vehicle.vehicleCode);
    assert.equal(lookupByCode.id, vehicle.id);

    const handedOverAt = new Date(Date.now() + 60_000).toISOString();
    const handover = await service.handover(vehicleActor, vehicle.id, {
      dealerPartnerId: dealerId,
      customerPartnerId: customerId,
      handedOverAt,
      reference: `DELIVERY-${suffix()}`,
      evidence: { signed: true },
    });
    assert.ok(handover.handover.id);

    const current = await db.query<any>(`SELECT * FROM vehicle.v_current_ownership WHERE vehicle_id=$1`, [vehicle.id]);
    assert.equal(current.rows[0].owner_partner_id, customerId);
    const lifecycle = await db.query<any>(`SELECT * FROM vehicle.v_current_lifecycle WHERE vehicle_id=$1`, [vehicle.id]);
    assert.equal(lifecycle.rows[0].lifecycle_state, 'OWNED');

    const garage = await service.garage(vehicleActor, customerId);
    assert.equal(garage.length, 1);
    assert.equal(garage[0].id, vehicle.id);

    const snapshot = await service.get360(vehicleActor, vehicle.id);
    assert.equal(snapshot.vehicle.frame_number, vehicle.frameNumber);
    assert.equal(snapshot.vehicle.owner_partner_id, customerId);
    assert.equal(snapshot.handovers.length, 1);
    assert.equal(snapshot.ownership.length, 1);
    assert.equal(snapshot.production.qc.length, 1);
    assert.ok(snapshot.lifecycle.length >= 3);

    await assert.rejects(
      db.query(`UPDATE vehicle.handovers SET note='rewrite' WHERE id=$1`, [handover.handover.id]),
      /append-only/,
    );
    await assert.rejects(
      service.handover(vehicleActor, vehicle.id, { dealerPartnerId: dealerId, customerPartnerId: customerId, handedOverAt: new Date(Date.now() + 120_000).toISOString() }),
      VehicleConflictError,
    );
  } finally {
    await db.close();
  }
});

test('Vehicle ownership transfer preserves history and stale-owner commands are rejected', { skip: !hasDatabase }, async () => {
  const db = new Database();
  try {
    const vehicleActor = await actor(db);
    const service = createVehicleService(db, audit);
    const vehicle = await bornVehicle(db, vehicleActor);
    const dealerId = await partner(db, 'DEALER');
    const firstOwner = await partner(db, 'CUSTOMER');
    const secondOwner = await partner(db, 'CUSTOMER');
    const thirdOwner = await partner(db, 'CUSTOMER');

    await service.handover(vehicleActor, vehicle.id, {
      dealerPartnerId: dealerId,
      customerPartnerId: firstOwner,
      handedOverAt: new Date(Date.now() + 60_000).toISOString(),
    });

    await service.transferOwnership(vehicleActor, vehicle.id, {
      expectedCurrentOwnerPartnerId: firstOwner,
      newOwnerPartnerId: secondOwner,
      occurredAt: new Date(Date.now() + 120_000).toISOString(),
      reason: 'Private resale',
    });

    const current = await db.query<any>(`SELECT * FROM vehicle.v_current_ownership WHERE vehicle_id=$1`, [vehicle.id]);
    assert.equal(current.rows[0].owner_partner_id, secondOwner);
    const history = await db.query<any>(`SELECT event_type,owner_partner_id FROM vehicle.ownership_events WHERE vehicle_id=$1 ORDER BY sequence_no`, [vehicle.id]);
    assert.deepEqual(history.rows.map((item) => item.event_type), ['ACQUIRED','RELEASED','ACQUIRED']);
    assert.equal(history.rows[0].owner_partner_id, firstOwner);
    assert.equal(history.rows[2].owner_partner_id, secondOwner);

    assert.equal((await service.garage(vehicleActor, firstOwner)).length, 0);
    assert.equal((await service.garage(vehicleActor, secondOwner)).length, 1);

    await assert.rejects(
      service.transferOwnership(vehicleActor, vehicle.id, {
        expectedCurrentOwnerPartnerId: firstOwner,
        newOwnerPartnerId: thirdOwner,
        occurredAt: new Date(Date.now() + 180_000).toISOString(),
      }),
      /current owner changed/,
    );

    await service.releaseOwnership(vehicleActor, vehicle.id, {
      expectedCurrentOwnerPartnerId: secondOwner,
      occurredAt: new Date(Date.now() + 240_000).toISOString(),
      reason: 'Ownership released pending next registration',
    });
    const released = await db.query<any>(`SELECT * FROM vehicle.v_current_ownership WHERE vehicle_id=$1`, [vehicle.id]);
    assert.equal(released.rows[0].owner_partner_id, null);
    const lifecycle = await db.query<any>(`SELECT * FROM vehicle.v_current_lifecycle WHERE vehicle_id=$1`, [vehicle.id]);
    assert.equal(lifecycle.rows[0].lifecycle_state, 'UNOWNED');
    assert.equal((await service.garage(vehicleActor, secondOwner)).length, 0);
  } finally {
    await db.close();
  }
});
