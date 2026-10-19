import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=(file)=>readFileSync(new URL(file,import.meta.url),'utf8');

test('Admin record links have stable canonical route and typed UUID target',()=>{
 const contract=read('./record-links.ts');
 assert.match(contract,/caseId/);
 assert.match(contract,/vehicleId/);
 assert.match(contract,/orderId/);
 assert.match(contract,/partnerId/);
 assert.match(contract,/vehicle: \['\/admin\/production\/vin-detail', 'vehicleId'\]/);
 assert.match(contract,/service: \['\/admin\/after-sales', 'caseId'\]/);
 assert.match(contract,/'service-intake': \['\/admin\/after-sales', 'vehicleId'\]/);
 assert.match(contract,/if \(!recordId\(id\)\) throw new Error/);
 assert.match(contract,/encodeURIComponent\(id\)/);
});
test('VIN record detail uses targeted authorized primary-key route instead of 1000-row scan',()=>{
 const controller=read('../../../api/src/vehicle.controller.ts');
 const service=read('../../../../domains/vehicle/src/application/vehicle-service.ts');
 const repository=read('../../../../domains/vehicle/src/infrastructure/postgres-vehicle-repository.ts');
 const ui=read('./vehicle-record-detail.tsx');
 const renderer=read('./renderer.tsx');
 assert.match(controller,/@Get\(':id'\)/);
 assert.match(controller,/vehicleService\.get\(requireAuth\(request\), id\)/);
 assert.match(service,/requireCapability\(actor,VehicleCapability\.Read\)/);
 assert.match(repository,/WHERE v\.id=\$1 LIMIT 1/);
 assert.match(ui,/\/api\/control\/v1\/vehicles\/'\+encodeURIComponent\(id\)/);
 assert.match(ui,/adminRecordHref\('service-intake',vehicle\.id\)/);
 assert.match(renderer,/<VehicleRecordDetail \/>/);
 assert.match(renderer,/screen\.route === '\/admin\/production\/vin-detail' \|\| screen\.route === '\/admin\/production\/vin'/);
 assert.ok(existsSync(new URL('../admin/production/vin-detail/page.tsx',import.meta.url)));
});
test('real inter-module links focus the selected order, customer and service case',()=>{
 const service=read('./service-cases.tsx');
 const customers=read('./admin-records.tsx');
 const production=read('../production/production-client.tsx');
 const commerce=read('../commerce/commerce-client.tsx');
 assert.match(service,/queryRecordId\('caseId'\)/);
 assert.match(service,/queryRecordId\('vehicleId'\)/);
 assert.match(service,/adminRecordHref\('vehicle',detail\.case\.vehicleId\)/);
 assert.match(service,/adminRecordHref\('service',c\.id\)/);
 assert.match(customers,/queryRecordId\('partnerId'\)/);
 assert.match(customers,/adminRecordHref\('vehicle',vehicle\.id\)/);
 assert.match(production,/adminRecordHref\('service-intake',vehicle\.id\)/);
 assert.match(commerce,/queryRecordId\('orderId'\)/);
 assert.match(commerce,/adminRecordHref\('customer',selectedOrder\.customer_partner_id\)/);
 assert.match(commerce,/linkedOrderId \? null/);
});
