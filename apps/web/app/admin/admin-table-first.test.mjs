import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('production record lists are semantic tables, with write actions preserved', () => {
  const client = source('../production/production-client.tsx');
  assert.match(client, /<table className=\{styles\.dataTable\}[^>]*>/);
  assert.match(client, /aria-label="车辆出生台账"/);
  assert.match(client, /aria-label="生产单元表格"/);
  assert.match(client, /<details className=\{styles\.createDrawer\}/);
  assert.match(client, /\/v1\/production\/orders/);
  assert.match(client, /\/v1\/vehicles\/birth/);
  assert.doesNotMatch(client, /styles\.(?:orderRow|vehicleGrid|vehicleCard)/);
});

test('vehicle specification details use one editable table, not accordion cards', () => {
  const client = source('../product/product-client.tsx');
  assert.match(client, /aria-label="车辆型号技术参数编辑表"/);
  assert.match(client, /activeModule\.fields/);
  assert.match(client, /onChange\('bomMapping', 'partIds'/);
  assert.doesNotMatch(client, /styles\.specModuleHeader/);
});

test('finance keeps write operations while rendering searchable record tables', () => {
  const client = source('../finance/finance-client.tsx');
  for (const label of ['财务单据', '应收应付义务', '收付款流水', '合作伙伴余额']) {
    assert.ok(client.includes('aria-label="' + label + '"'), label + ' should be a table');
  }
  assert.match(client, /summary\.documents\.filter\(matches\)/);
  assert.match(client, /<details className=\{styles\.operationDrawer\}>/);
  for (const endpoint of ['/v1/finance/documents', '/v1/finance/payments', '/v1/finance/allocations', '/v1/finance/landed-cost']) {
    assert.ok(client.includes(endpoint), endpoint + ' write contract must remain');
  }
});

test('warehouse reservations, stocktakes and counted quantities are table records', () => {
  const client = source('../inventory/inventory-client.tsx');
  for (const label of ['有效库存预留', '库存盘点记录', '盘点实盘明细']) {
    assert.ok(client.includes('aria-label="' + label + '"'), label + ' should be a table');
  }
  assert.match(client, /\/v1\/inventory\/reservations\/\$\{row\.id\}\/issue/);
  assert.match(client, /\/v1\/warehouse\/stocktakes\/\$\{selectedStocktake\.id\}\/counts/);
  assert.doesNotMatch(client, /styles\.stocktakeList/);
});

test('admin route renderer avoids obsolete fixture card and simulated VIN detail panels', () => {
  const renderer = source('../_design/renderer.tsx');
  assert.match(renderer, /尚未接入真实业务/);
  assert.match(renderer, /<VehicleRecordDetail \/>/);
  assert.doesNotMatch(renderer, /原 VIN 详情设计图/);
  assert.doesNotMatch(renderer, /av-screen-links"/);
  assert.doesNotMatch(renderer, /<Blocks blocks=\{screen\.blocks\} stacked=/);
});
