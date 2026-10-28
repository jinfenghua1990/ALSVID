import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(path.join(process.env.FC1_PLAYWRIGHT_ROOT, 'package.json'));
const { chromium } = require('playwright');
const output = process.env.FC1_REVIEW_OUTPUT || '.tmp/fc1-v4-review';
const base = 'http://127.0.0.1:3000';
await mkdir(output, { recursive: true });
// Disposable runner-only authentication fixture. No production flags or auth code change.
const auth = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/v1/auth/me' && request.headers.authorization === 'Bearer commerce-lab-ci') {
    response.end(JSON.stringify({ data: { userId: 'ci-admin', email: 'ci@example.invalid',
      displayName: 'CI Admin', roles: ['system_admin'], permissions: [] } }));
  } else { response.statusCode = 401; response.end('{}'); }
});
await new Promise((resolve, reject) => { auth.once('error', reject); auth.listen(4000, resolve); });
const browser = await chromium.launch({ headless: true });
const report = { sha: process.env.FC1_REVIEW_SHA, checks: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/admin/commerce-lab');
  await page.waitForURL(/\/login\?/);
  report.checks.push('unauthenticated route remains protected');
  await context.addCookies([{ name: 'alsvid_session', value: 'commerce-lab-ci', url: base, httpOnly: true }]);
  await page.goto(base + '/admin/commerce-lab');
  await page.locator('[data-commerce-lab-overview]').waitFor();
  assert.equal(await page.locator('[data-commerce-lab]').count(), 0, 'overview does not mount the in-memory demo');
  assert.equal(await page.getByText('设计页面 / 流程预览 · 0', { exact: true }).count(), 0, 'empty design groups stay hidden');
  const primary = page.getByRole('navigation', { name: '一级导航', exact: true });
  const expectedModules = [
    '/admin', '/admin/product', '/admin/ecommerce', '/admin/dealers', '/admin/production',
    '/admin/inventory', '/admin/logistics', '/admin/supply', '/admin/customers',
    '/admin/after-sales', '/admin/finance', '/admin/analytics', '/admin/settings',
  ];
  assert.equal(await primary.getByRole('link').count(), expectedModules.length, 'all 13 modules appear in top navigation');
  for (const href of expectedModules) {
    const link = primary.locator('a[href="' + href + '"]');
    assert.equal(await link.count(), 1, 'direct visible module: ' + href);
    assert.equal(await link.isVisible(), true, 'link is not hidden: ' + href);
  }
  assert.equal(await primary.getByRole('link', { name: '商城方案对比' }).count(), 0, 'unused commerce comparison removed from navigation');
  assert.equal(await primary.getByRole('button', { name: '更多模块' }).count(), 0, 'no hidden More drawer');
  await primary.locator('a[href="/admin/finance"]').click();
  await page.waitForURL(base + '/admin/finance');
  await page.goto(base + '/admin/commerce-lab');
  await page.locator('[data-commerce-lab-overview]').waitFor();
  report.checks.push('all 13 modules directly visible, legacy comparison has no primary entry');

  const secondary = page.getByRole('complementary', { name: '二级导航', exact: true });
  const catalogLink = secondary.getByRole('link', { name: '独立商品管理', exact: true });
  const catalogHref = new URL(await catalogLink.getAttribute('href'), base);
  assert.equal(catalogHref.pathname, '/admin/commerce-lab/catalog');
  assert.equal(catalogHref.searchParams.get('alsvidMenuLabel'), '独立商品管理');
  assert.ok(catalogHref.searchParams.get('alsvidMenu'), 'secondary menu identity is preserved for a distinct workspace tab');
  report.checks.push('legacy comparison deep links remain compatible, but navigation is no longer promoted');
  await page.screenshot({ path: path.join(output, 'commerce-lab-overview-desktop.png'), fullPage: true });
  await secondary.getByRole('link', { name: '旧版交互样机', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/admin/commerce-lab/reference' && url.searchParams.get('alsvidMenuLabel') === '旧版交互样机');
  const lab = page.locator('[data-commerce-lab]');
  await lab.waitFor();
  assert.equal(await primary.getByRole('link', { name: '商城方案对比' }).count(), 0);
  report.checks.push('legacy demo remains reachable under its own protected reference route');
  const mutations = [];
  page.on('request', request => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.url()); });
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await lab.getByRole('button', { name: '购买页面预览', exact: true }).click();
  await lab.getByRole('button', { name: '加入演示购物袋', exact: true }).first().click();
  await lab.getByRole('button', { name: '购物袋 (1)', exact: true }).click();
  await lab.getByRole('button', { name: '生成演示单并查看后台', exact: true }).click();
  await lab.getByText('DEMO-001', { exact: true }).waitFor();
  await lab.getByRole('button', { name: '演示标记处理', exact: true }).click();
  await lab.getByRole('cell', { name: '已标记处理', exact: true }).waitFor();
  report.checks.push('storefront demo order appears in isolated Chinese admin and can be marked processed');

  await lab.getByRole('button', { name: '商品管理', exact: true }).click();
  await lab.getByRole('spinbutton', { name: 'demo-fc1 示例售价', exact: true }).fill('3199');
  await lab.getByRole('textbox', { name: 'demo-fc1 名称', exact: true }).fill('FC1 CI 示例');
  await lab.getByRole('button', { name: '购买页面预览', exact: true }).click();
  await lab.getByRole('heading', { name: 'FC1 CI 示例', exact: true }).waitFor();
  assert.match(await lab.innerText(), /3\.199,00/);
  await page.screenshot({ path: path.join(output, 'commerce-lab-storefront-desktop.png'), fullPage: true });
  await lab.getByRole('button', { name: '手机宽度', exact: true }).click();
  const storeWidth = await lab.locator('[data-mobile="true"]').evaluate(element => element.getBoundingClientRect().width);
  assert.ok(storeWidth <= 390);
  await page.screenshot({ path: path.join(output, 'commerce-lab-storefront-phone.png'), fullPage: true });
  await lab.getByRole('button', { name: '中文后台预览', exact: true }).click();
  await lab.getByRole('button', { name: '下架', exact: true }).first().click();
  await lab.getByRole('button', { name: '购买页面预览', exact: true }).click();
  assert.equal(await lab.getByRole('heading', { name: 'FC1 CI 示例', exact: true }).count(), 0);
  report.checks.push('admin name/price/publication changes update only lab storefront');
  assert.deepEqual(mutations, [], 'lab interactions must not issue backend writes');
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), before, 'original browser storage is unchanged');

  // The Admin client draft store must survive an actual route change (not just
  // a label-only tab switch). No writes to backend or browser storage.
  await primary.locator('a[href="/admin/finance"]').click();
  await page.waitForURL(base + '/admin/finance');
  const resume = page.locator('.workspaceTabs a.workspaceTabLink[href*="/admin/commerce-lab/reference"]');
  await resume.waitFor();
  await resume.click();
  await page.waitForURL(url => url.pathname === '/admin/commerce-lab/reference');
  await lab.waitFor();
  assert.equal(await lab.count(), 1, 'only one Commerce Lab instance is mounted');
  await lab.getByRole('button', { name: '中文后台预览', exact: true }).click();
  await lab.getByRole('button', { name: '商品管理', exact: true }).click();
  assert.equal(await lab.getByRole('textbox', { name: 'demo-fc1 名称', exact: true }).inputValue(),
    'FC1 CI 示例', 'unsaved product name must survive a workspace tab switch');
  assert.equal(await lab.getByRole('spinbutton', { name: 'demo-fc1 示例售价', exact: true }).inputValue(),
    '3199', 'unsaved product price must survive a workspace tab switch');
  report.checks.push('Admin tab switch retains unsaved product name and price in memory');

  await page.reload(); await lab.waitFor();
  await lab.getByRole('button', { name: '中文后台预览', exact: true }).click();
  await lab.getByRole('button', { name: '订单管理 (0)', exact: true }).click();
  await lab.getByRole('heading', { name: '还没有演示单', exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'commerce-lab-admin-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'commerce-lab-admin-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile page fits viewport');
  report.checks.push('reload clears demo data; desktop/mobile views render');
  // Deterministic read-only fixtures prove that a real product renders as one table row.
  await page.route('**/api/control/v1/product/catalog', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: {
      productTypes: [{ code: 'BIKE', name: '整车', description: '', status: 'ACTIVE' }],
      platforms: [{ id: 'platform-ci', code: 'FC', name: 'Folding Carbon', description: '', status: 'ACTIVE', version: 1 }],
      models: [{ id: 'model-ci', platform_id: 'platform-ci', product_type_code: 'BIKE', code: 'FC1', name: 'CI 商品档案测试', description: '', status: 'ACTIVE', version: 1 }],
      variants: [], skus: [],
    } }),
  }));
  await page.route('**/api/control/v1/engineering', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { parts: [], boms: [], buildSpecs: [] } }),
  }));
  // Canonical admin product route must show the live, compact archive rather than design fixtures.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/admin/product');
  const archive = page.locator('[data-area="product"]');
  await archive.waitFor();
  await archive.getByRole('heading', { name: '整车产品', exact: true }).waitFor();
  assert.equal(await archive.locator('#model-register').count(), 1, 'bicycle archive is the focused initial list');
  await archive.getByRole('row', { name: /FC1/ }).waitFor();
  assert.equal(await archive.locator('#model-register tbody tr').count(), 1, 'one bicycle occupies one data row');
  assert.equal(await archive.locator('.unused-kpi-placeholder').count(), 0);
  assert.equal(await archive.locator('#product-info-panel').count(), 0, 'no duplicated product-category accordion');
  const maintenancePanel = archive.locator('#product-maintenance-panel');
  assert.equal(await maintenancePanel.evaluate(node => node.open), false, 'variant and SKU forms start collapsed');
  await page.screenshot({ path: path.join(output, 'admin-product-archive-desktop.png'), fullPage: true });
  await archive.getByRole('button', { name: '＋ 新建整车' }).first().click();
  const createBicycle = archive.getByRole('dialog', { name: '新建整车' });
  await createBicycle.waitFor();
  assert.equal(await createBicycle.getByRole('textbox', { name: '商品编码' }).count(), 1);
  await createBicycle.getByRole('button', { name: '取消' }).click();
  assert.equal(await archive.getByRole('dialog').count(), 0, 'cancelling new product does not write data');
  await archive.getByRole('button', { name: '自定义字段管理' }).click();
  await archive.getByRole('dialog', { name: '管理商品字段' }).waitFor();
  await archive.getByRole('button', { name: '新建字段' }).click();
  await archive.getByRole('dialog', { name: '新建商品字段' }).waitFor();
  await archive.getByRole('dialog', { name: '新建商品字段' }).getByRole('button', { name: '取消' }).click();
  await archive.getByRole('dialog', { name: '管理商品字段' }).getByRole('button', { name: '关闭' }).click();
  report.checks.push('model custom field management and create dialogs render without fixture writes');

  await page.goto(base + '/admin/product?type=PARTS#parts');
  await archive.getByRole('heading', { name: '零配件', exact: true }).waitFor();
  await archive.getByRole('button', { name: '生产零件' }).waitFor();
  await archive.getByRole('button', { name: '＋ 新建零件' }).first().click();
  await archive.getByRole('dialog', { name: '新建零件' }).waitFor();
  await archive.getByRole('dialog').getByRole('button', { name: '取消' }).click();
  await archive.getByRole('button', { name: '可售配件' }).click();
  await archive.getByRole('heading', { name: '零配件', exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'admin-product-parts-desktop.png'), fullPage: true });

  await page.goto(base + '/admin/product#series');
  await archive.getByRole('heading', { name: '技术平台', exact: true }).waitFor();
  await archive.locator('#series').waitFor();
  await archive.getByRole('table', { name: '技术平台档案' }).waitFor();
  assert.equal(await archive.getByRole('row', { name: /Folding Carbon/ }).count(), 1, 'only backed technical platforms are shown');
  await archive.getByRole('button', { name: '新建技术平台' }).click();
  await archive.getByRole('dialog', { name: '新建技术平台' }).waitFor();
  await archive.getByRole('dialog', { name: '新建技术平台' }).getByRole('button', { name: '取消' }).click();
  await archive.getByRole('row', { name: /Folding Carbon/ }).getByRole('button', { name: '编辑' }).click();
  await archive.getByRole('dialog', { name: '编辑技术平台' }).waitFor();
  await archive.getByRole('dialog', { name: '编辑技术平台' }).getByRole('button', { name: '取消' }).click();
  await page.screenshot({ path: path.join(output, 'admin-product-platforms-desktop.png'), fullPage: true });
  report.checks.push('product archive has focused bicycle, parts and platform views; create dialogs open without writes');

  // Inventory now opens as two real-source tables rather than an unstructured wall of forms.
  await page.route('**/api/control/v1/warehouse', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: {
      warehouses: [{ id: 'warehouse-ci', code: 'DE-CI', name: 'CI warehouse', country_code: 'DE', timezone: 'Europe/Berlin', partner_name: null, active: true }],
      locations: [], stocktakes: [], counts: [],
    } }),
  }));
  await page.route('**/api/control/v1/inventory', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: {
      balances: [{
        item_kind: 'SKU', part_id: null, sku_id: 'sku-ci', vehicle_id: null,
        warehouse_code: 'DE-CI', warehouse_name: 'CI warehouse', location_code: 'A-01', location_name: 'A-01',
        unit: 'EA', on_hand: '3', reserved: '1', available: '2',
        part_number: null, part_name: null, sku: 'CI-SKU', sku_name: 'CI product', frame_number: null,
      }],
      movements: [], reservations: [],
    } }),
  }));
  // InventoryClient loads five sources concurrently. The vehicles source must also be
  // intercepted or its mock-auth 401 can redirect away before the stock tables settle.
  await page.route('**/api/control/v1/vehicles', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));
  await page.goto(base + '/admin/inventory');
  const stock = page.locator('[data-area="inventory"]');
  await stock.waitFor();
  await stock.getByRole('cell', { name: 'CI warehouse', exact: true }).first().waitFor();
  await stock.locator('#warehouses tbody tr').first().waitFor({ state: 'visible' });
  assert.equal(await stock.locator('#warehouses tbody tr').count(), 1, 'one warehouse occupies one row');
  await stock.locator('#balances tbody tr').first().waitFor({ state: 'visible' });
  assert.equal(await stock.locator('#balances tbody tr').count(), 1, 'one stock position occupies one row');
  assert.equal(await stock.locator('#inventory-advanced').evaluate(node => node.open), false, 'operational forms start collapsed');
  assert.equal(new URL(page.url()).pathname, '/admin/inventory', 'the isolated inventory page must not redirect to login');
  await page.screenshot({ path: path.join(output, 'admin-inventory-archive-desktop.png'), fullPage: true });
  report.checks.push('warehouse and stock balances render from fixture API, advanced forms collapsed');

  assert.deepEqual(errors, [], 'no browser runtime errors');
  await writeFile(path.join(output, 'commerce-lab-report.json'), JSON.stringify(report, null, 2));
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => auth.close(resolve));
}
