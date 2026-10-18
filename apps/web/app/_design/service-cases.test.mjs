import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('service case routes are authenticated and delegated to the service domain',()=>{
 const ctl=read('../../../api/src/service-cases.controller.ts');
 const module=read('../../../api/src/app.module.ts');
 const runtime=read('../../../api/src/runtime.ts');
 const domain=read('../../../../domains/service/src/application/service-case-service.ts');
 assert.match(ctl,/@Controller\('v1\/service\/cases'\)/);
 assert.match(ctl,/@Post\(':id\/transition'\)/);
 assert.ok(!ctl.includes('@Public'));
 assert.ok(module.includes('ServiceCasesController'));
 assert.ok(runtime.includes('createServiceCaseService(database, auditService)'));
 assert.match(domain,/ServiceCaseCapabilities\.Write/);
 assert.match(domain,/SERVICE_CASE_INTERNAL_ONLY/);
 assert.match(domain,/expectedVersion/);
});
test('service case API tables enforce history and permission invariants',()=>{
 const sql=read('../../../../packages/database/migrations/0025_service_case_foundation.sql');
 assert.match(sql,/CREATE SCHEMA IF NOT EXISTS service/);
 assert.match(sql,/REFERENCES vehicle\.vehicles\(id\)/);
 assert.match(sql,/CREATE TRIGGER service_history_immutable/);
 assert.match(sql,/FOR EACH ROW EXECUTE FUNCTION service\.prevent_history_mutation/);
 assert.match(sql,/service\.read/);
 assert.match(sql,/service\.write/);
 assert.match(sql,/service_cases_guard_update/);
});
test('canonical after-sales screen uses real internal workflow and preserves Ardot preview',()=>{
 const integrated=read('./integrated-operations.tsx');
 const renderer=read('./renderer.tsx');
 const ui=read('./service-cases.tsx');
 assert.match(integrated,/case '售后': return <ServiceCaseClient \/>/);
 assert.match(renderer,/<IntegratedOperations area=\{screen\.area\} \/>/);
 assert.match(renderer,/av-design-archive/);
 assert.match(ui,/\/v1\/service\/cases/);
 assert.match(ui,/expectedVersion:detail\.case\.version/);
 assert.match(ui,/不自动判定保修/);
});
