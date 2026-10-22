import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const paths = {
  ecommerce: '../admin/ecommerce/page.tsx',
  finance: '../admin/finance/page.tsx',
  logistics: '../admin/logistics/page.tsx',
};

test('business modules expose guarded canonical Admin routes and retain old order detail routes', () => {
  for (const [module, path] of Object.entries(paths)) {
    assert.ok(existsSync(new URL(path, import.meta.url)), module + ' module route');
    assert.match(read(path), /AdminScreen screen=\{screen\}/, module);
    assert.match(read(path), new RegExp('module:' + module), module);
  }
  const adminLayout = read('../admin/layout.tsx');
  assert.match(adminLayout, /requirePortalSession\('admin'/);
  assert.ok(existsSync(new URL('../admin/orders/page.tsx', import.meta.url)), 'old order bookmarks and record IDs must remain resolvable');
});

test('one primary navigation maps old areas to new business destinations without second data stores', () => {
  const ui = read('./renderer.tsx');
  for (const href of ['/admin/product', '/admin/ecommerce', '/admin/dealers', '/admin/production', '/admin/inventory', '/admin/supply', '/admin/customers', '/admin/after-sales', '/admin/finance', '/admin/analytics', '/admin/settings']) {
    assert.ok(ui.includes("href: '" + href + "'"), href);
  }
  assert.ok(!ui.includes("{ label: '订单', href: '/admin/orders' }"), 'legacy order lookup no longer primary navigation');
  assert.match(ui, /legacyAreas\.includes\(area\)/);
  assert.match(ui, /商城促销与支付配置|营销活动（待接入）/);
});

test('ecommerce reuses Product and Commerce API components and Product no longer duplicates publication forms', () => {
  const ecommerce = read('./ecommerce-admin-workspace.tsx');
  const product = read('../product/product-client.tsx');
  assert.match(ecommerce, /<HomepageProductBindingPanel models=\{models\}/);
  assert.match(ecommerce, /<CatalogPublicationPanel models=\{models\}/);
  assert.match(ecommerce, /<StorefrontOrderDraftPanel \/>/);
  assert.match(ecommerce, /<EcommerceInventoryPanel \/>/);
  const stock = read('./ecommerce-inventory-panel.tsx');
  assert.match(stock, /\/api\/control\/v1\/inventory/);
  assert.match(stock, /row\.item_kind === 'SKU'/);
  assert.match(stock, /库存未知，不代表缺货或零库存/);
  assert.match(stock, /台账可用量不等于商城可售量/);
  assert.doesNotMatch(stock, /method:\s*'POST'/);
  assert.match(read('./renderer.tsx'), /'电商库存': '\/admin\/ecommerce#inventory'/);
  assert.doesNotMatch(product, /<HomepageProductBindingPanel models=/);
  assert.doesNotMatch(product, /<CatalogPublicationPanel models=/);
  assert.match(read('../_lib/admin-sku-pricing-navigation.ts'), /\/admin\/ecommerce\?/);
});

test('finance and logistics mount their original authenticated workspaces, without parallel business storage', () => {
  const integrated = read('./integrated-operations.tsx');
  const finance = read('../finance/finance-client.tsx');
  const logistics = read('../logistics/logistics-client.tsx');
  for (const name of ['FinanceClient', 'LogisticsClient']) {
    assert.ok(integrated.includes('<' + name + ' embedded />'), name);
  }
  assert.match(finance, /<OperationsFrame embedded=\{embedded\} area="finance"/);
  assert.match(logistics, /<OperationsFrame embedded=\{embedded\} area="logistics"/);
  assert.ok(existsSync(new URL('../finance/page.tsx', import.meta.url)));
  assert.ok(existsSync(new URL('../logistics/page.tsx', import.meta.url)));
});
