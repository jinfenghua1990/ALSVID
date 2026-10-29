import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screens = JSON.parse(readFileSync(new URL('./synced-screens.json', import.meta.url), 'utf8'));
const at = route => screens.find(screen => screen.route === route);

test('reviewed chart proportions agree with their sample totals', () => {
  const regions = at('/admin/dealers').blocks.find(block => block.title === '区域授权');
  assert.equal(regions.kind, 'bars');
  assert.equal(Math.round(regions.items.reduce((sum, item) => sum + item.percent, 0) * 10), 1000);
  const analytics = at('/admin/analytics');
  const ranking = analytics.blocks.find(block => block.title === '产品销售排行 · 原讨论样例');
  assert.equal(ranking.kind, 'bars');
  for (const item of ranking.items) assert.equal(item.percent, Number.parseInt(item.value, 10) / 200 * 100);
  assert.ok(!JSON.stringify(analytics).includes('18,420'));
  assert.ok(!analytics.blocks.some(block => block.title === '细分表'));
  const dealers = at('/admin/dealers').blocks.find(block => block.kind === 'table');
  assert.deepEqual(dealers.columns.slice(0, 2), ['经销商', '区域']);
  for (const route of ['/admin/product', '/admin/dealers']) assert.match(at(route).subtitle, /示例数据/);
});

test('reviewed screens have unique protected routes and complete table rows', () => {
  assert.equal(screens.length, 85);
  assert.equal(new Set(screens.map(screen => screen.route)).size, screens.length);
  for (const screen of screens) {
    assert.ok(screen.route.startsWith('/admin/'));
    assert.ok(screen.title && (screen.blocks.length || screen.route === '/admin/production'), screen.route);
    for (const step of screen.steps ?? []) assert.ok(at(step.href), step.href);
    for (const block of screen.blocks) {
      if (block.kind === 'table') for (const row of block.rows) assert.equal(row.length, block.columns.length, `${screen.route}: ${block.title}`);
    }
  }
});

test('delivered vehicle stays on the reviewed model, BOM and chronology', () => {
  const text = JSON.stringify(at('/admin/production/vin-detail'));
  for (const fact of ['FC1 Pro', 'PRO · 折叠版', 'V2.0', '2026-09-20', '2026-10-01', 'AL-2026-0184']) assert.ok(text.includes(fact), fact);
  assert.ok(!text.includes('交付日期：2026-10-16'));
  const inventory = at('/admin/inventory').blocks.find(block => block.kind === 'table' && block.columns.includes('库存状态'));
  assert.equal(inventory.rows.find(row => row[0] === 'FC1 Pro').at(-1), '混合库存');
});

test('replacement demo does not close the existing repair or invent missing history', () => {
  const replacement = JSON.stringify(at('/admin/after-sales/parts/replacement'));
  assert.ok(replacement.includes('DEMO-SR-001'));
  const history = JSON.stringify(at('/admin/customers/history'));
  for (const fact of ['SR-2026-001', '维修中', '李工', '待导入']) assert.ok(history.includes(fact), fact);
  assert.ok(JSON.stringify(at('/admin/after-sales/network')).includes('不改变当前负责人'));
});
