import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('Supplier portal cannot call unsafe internal procurement listing',()=>{
 const ui=read('../supplier/supplier-orders-client.tsx');
 const ctl=read('../../../api/src/supplier-portal.controller.ts');
 const domain=read('../../../../domains/procurement/src/application/supplier-portal-service.ts');
 const repo=read('../../../../domains/procurement/src/infrastructure/postgres-supplier-portal-repository.ts');
 const sql=read('../../../../packages/database/migrations/0027_supplier_membership_and_po_ack.sql');
 assert.match(ctl,/@Controller\('v1\/supplier'\)/);
 assert.match(ui,/\/v1\/supplier/);
 assert.doesNotMatch(ui,/\/v1\/procurement/);
 assert.match(domain,/supplier\.po\.read/);
 assert.match(domain,/supplier\.po\.ack/);
 assert.match(repo,/identity\.supplier_memberships/);
 assert.match(repo,/m\.user_id=\$1 AND m\.status='ACTIVE'/);
 assert.match(sql,/UNIQUE\(po_id,client_request_id\)/);
 assert.match(sql,/supplier_ack_immutable/);
});

test('My garage uses server-side owner session and no preview VIN or fixture record',()=>{
 const pure=read('../my/_data/garage.ts');
 const live=read('../my/_data/garage-live.ts');
 const api=read('../../../api/src/owner-garage.controller.ts');
 const repo=read('../../../../domains/vehicle/src/infrastructure/postgres-vehicle-repository.ts');
 const ownerSchema=read('../../../../packages/database/migrations/0028_vehicle_owner_access_events.sql');
 assert.doesNotMatch(pure,/ALSFC1P26X000417/);
 assert.doesNotMatch(pure,/const vehicles: OwnerVehicle\[\]/);
 assert.match(live,/requirePortalSession\('my'/);
 assert.match(live,/alsvid_my_session|sessionCookieNameForPortal\('my'\)/);
 assert.match(api,/@Controller\('v1\/my\/garage'\)/);
 assert.match(repo,/vehicle\.owner_access_events/);
 assert.match(repo,/owner\.customer_user_id=\$1/);
 assert.match(ownerSchema,/owner_access_events_immutable/);
});

test('Admin cross portal binding actions require evidence and internal authorization',()=>{
 const ui=read('./portal-bindings-admin.tsx');
 const identity=read('../../../../domains/identity/src/application/identity-service.ts');
 const owner=read('../../../../domains/vehicle/src/application/vehicle-service.ts');
 const integrated=read('./integrated-operations.tsx');
 assert.match(ui,/supplier-memberships/);
 assert.match(ui,/owner-access\/grant/);
 assert.match(ui,/owner-access\/revoke/);
 assert.match(identity,/identity\.role\.manage/);
 assert.match(owner,/vehicle\.owner\.manage/);
 assert.match(integrated,/PortalBindingsAdmin/);
});
