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
test('canonical after-sales screen uses real internal workflow without obsolete Ardot preview',()=>{
 const integrated=read('./integrated-operations.tsx');
 const renderer=read('./renderer.tsx');
 const ui=read('./service-cases.tsx');
 assert.match(integrated,/case '售后': return <ServiceCaseClient \/>/);
 assert.match(renderer,/<IntegratedOperations area=\{screen\.area\} route=\{screen\.route\} \/>/);
 assert.doesNotMatch(renderer,/av-design-archive/);
 assert.match(ui,/\/v1\/service\/cases/);
 assert.match(ui,/expectedVersion:detail\.case\.version/);
 assert.match(ui,/不自动判定保修/);
});

test('preliminary warranty evidence is append-only and gated independently from service.write',()=>{
 const schema=read('../../../../packages/database/migrations/0026_service_evidence_foundation.sql');
 const domain=read('../../../../domains/service/src/application/service-case-service.ts');
 const repository=read('../../../../domains/service/src/infrastructure/postgres-service-case-repository.ts');
 const controller=read('../../../api/src/service-cases.controller.ts');
 const ui=read('./service-cases.tsx');
 assert.match(schema,/CREATE TABLE service\.case_activities/);
 assert.match(schema,/service_activities_immutable/);
 assert.match(schema,/UNIQUE \(case_id,client_request_id\)/);
 assert.match(schema,/service\.warranty\.review/);
 assert.match(domain,/authorize\(actor,'service\.warranty\.review'\)/);
 assert.match(domain,/POSSIBLY_COVERED/);
 assert.match(domain,/POSSIBLY_EXCLUDED/);
 assert.match(domain,/findActivityByRequest/);
 assert.match(repository,/ON CONFLICT\(case_id,client_request_id\) DO NOTHING/);
 assert.match(controller,/@Post\(':id\/activities'\)/);
 assert.match(ui,/clientRequestId:requestId/);
 assert.match(ui,/初审意见/);
 assert.match(ui,/不自动建立车主归属/);
});


test('after-sales P1 queue filters only real case records without fabricated SLA or ownership',()=>{
 const ui=read('./service-cases.tsx');
 assert.match(ui,/const filteredCases=cases\.filter/);
 assert.match(ui,/queueCounts=Object\.fromEntries/);
 assert.match(ui,/aria-label="售后工单状态筛选"/);
 assert.match(ui,/filteredCases\.map/);
 assert.match(ui,/未接入负责人及 SLA 时不展示虚构的待分配或超时数量/);
});
