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
 assert.match(repo,/c\.created_at >= owner\.occurred_at/);
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

test('owner service timeline exposes only status and title from verified current-owned VIN',()=>{
 const repo=read('../../../../domains/service/src/infrastructure/postgres-service-case-repository.ts');
 const domain=read('../../../../domains/service/src/application/service-case-service.ts');
 const controller=read('../../../api/src/my-owner-service.controller.ts');
 const garage=read('../my/_data/garage-live.ts');
 assert.match(repo,/FROM service\.cases c JOIN LATERAL/);
 assert.match(repo,/owner\.customer_user_id=\$1/);
 assert.match(repo,/SELECT c\.id,c\.case_number,c\.vehicle_id,c\.title,c\.status,c\.created_at,c\.updated_at/);
 assert.match(domain,/MY_SERVICE_FORBIDDEN/);
 assert.match(controller,/@Controller\('v1\/my\/service'\)/);
 assert.match(garage,/\/v1\/my\/service\/cases/);
 assert.doesNotMatch(controller,/case\.activities|assessment|internalNotes/);
});

test('Admin reads current supplier/owner link status and blocks blind or duplicate binding',()=>{
 const ui=read('./portal-bindings-admin.tsx');
 const identity=read('../../../../domains/identity/src/application/identity-service.ts');
 const vehicle=read('../../../../domains/vehicle/src/application/vehicle-service.ts');
 const apiIdentity=read('../../../api/src/auth.controller.ts');
 const apiOwner=read('../../../api/src/owner-garage.controller.ts');
 const customers=read('./admin-records.tsx');
 assert.match(ui,/supplierState!=='ready'/);
 assert.match(ui,/ownerState!=='ready'/);
 assert.match(ui,/supplierAccess\?\.status==='ACTIVE'/);
 assert.match(ui,/ownerAccess\?\.status==='GRANTED'/);
 assert.match(ui,/setSupplierAttested/);
 assert.match(ui,/setOwnerAttested/);
 assert.match(ui,/refreshSupplierAccess/);
 assert.match(ui,/refreshOwnerAccess/);
 assert.match(apiIdentity,/@Get\('supplier-memberships\/:userId\/:partnerId'\)/);
 assert.match(apiOwner,/@Get\(':id\/owner-access'\)/);
 assert.match(identity,/async supplierMembershipStatus/);
 assert.match(vehicle,/async ownerAccess/);
 assert.doesNotMatch(customers,/OwnerAccessManager/);
});

test('My ALSVID submits real after-sales only for currently verified owner with idempotency and server audit',()=>{
 const page=read('../my/service/new/page.tsx');
 const form=read('../my/service/new/owner-service-request-form.tsx');
 const controller=read('../../../api/src/my-owner-service.controller.ts');
 const domain=read('../../../../domains/service/src/application/service-case-service.ts');
 const repo=read('../../../../domains/service/src/infrastructure/postgres-service-case-repository.ts');
 const migration=read('../../../../packages/database/migrations/0029_owner_service_intake.sql');
 assert.match(page,/OwnerServiceRequestForm/);
 assert.doesNotMatch(page,/type="button" disabled>提交申请/);
 assert.match(form,/\/api\/control\/v1\/my\/service\/cases/);
 assert.match(form,/clientRequestId/);
 assert.match(form,/crypto\.randomUUID/);
 assert.match(controller,/@Post\('cases'\)/);
 assert.match(domain,/async ownerCreateCase/);
 assert.match(domain,/ownerVehicleAccessible\(actor\.userId,vehicleId,e\)/);
 assert.match(domain,/findOwnerSubmission/);
 assert.match(domain,/service\.owner_case_created/);
 assert.match(repo,/vehicle\.owner_access_events/);
 assert.match(repo,/FOR UPDATE OF v/);
 assert.match(migration,/UNIQUE\(customer_user_id,client_request_id\)/);
 assert.match(migration,/service_owner_submissions_immutable/);
});

test('supplier PO dates are returned as SQL text, without timezone conversion ambiguity',()=>{
 const repository=read('../../../../domains/procurement/src/infrastructure/postgres-supplier-portal-repository.ts');
 const projected=repository.match(/requested_date::text AS requested_date/g)??[];
 assert.equal(projected.length,2,'both list and detail must preserve original published YYYY-MM-DD');
});
