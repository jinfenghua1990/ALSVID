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
  const registry = read('./business-module-registry.ts');
  for (const href of ['/admin/product', '/admin/ecommerce', '/admin/dealers', '/admin/production', '/admin/inventory', '/admin/supply', '/admin/customers', '/admin/after-sales', '/admin/finance', '/admin/analytics', '/admin/settings']) {
    assert.ok(registry.includes("href: '" + href + "'"), href);
  }
  assert.ok(!registry.includes("{ label: '订单', href: '/admin/orders' }"), 'legacy order lookup no longer primary navigation');
  assert.match(ui, /const AREAS = ADMIN_MODULES/);
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
  assert.match(stock, /row\.item_kind === 'VEHICLE'/);
  assert.match(stock, /二者分别展示，不能叠加算总库存/);
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

test('framework directory has a single source of 12 Admin modules and does not present mocked KPI records', () => {
  const source = read('./business-module-registry.ts');
  const directory = read('./admin-module-directory.tsx');
  const ui = read('./renderer.tsx');
  const labels = [...source.matchAll(/\{ label: '([^']+)', href: '(\/admin[^']*)'/g)];
  assert.equal(labels.length, 12, 'exactly twelve top-level modules');
  assert.equal(new Set(labels.map(match => match[1])).size, 12, 'module labels are unique');
  assert.equal(new Set(labels.map(match => match[2])).size, 12, 'module routes are unique');
  assert.match(directory, /ADMIN_MODULES\.map\(/);
  assert.match(directory, /部分功能接入/);
  assert.match(ui, /<AdminModuleDirectory \/>/);
  assert.match(ui, /!isIntegratedOverview && !isLiveProductRoot \? <div className="av-railgroup">/);
  assert.doesNotMatch(directory, /api\/control|const exampleKpi/);
});


test('ecommerce workspace exposes direct section navigation and labels unfinished commerce capabilities honestly', () => {
  const workspace = read('./ecommerce-admin-workspace.tsx');
  const styles = read('./design-system.css');
  for (const id of ['homepage', 'publications', 'inventory', 'b2c', 'commerce-next']) {
    assert.ok(workspace.includes(id), 'ecommerce section anchor: ' + id);
  }
  assert.match(workspace, /aria-label="电商模块功能导航"/);
  assert.match(workspace, /可售库存 ATP/);
  assert.match(workspace, /公开结账与 PSP 支付/);
  assert.match(workspace, /促销与优惠券/);
  assert.match(workspace, /待开发/);
  assert.match(workspace, /暂未开放/);
  assert.match(workspace, /台账可用量不能直接作为商城可售量/);
  assert.match(styles, /\.av-commerce-nav/);
  assert.match(styles, /\.av-commerce-roadmap-grid/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.doesNotMatch(workspace, /fake|mock KPI|模拟订单数量/i);
});


test('embedded ecommerce sections inherit the Admin theme and use one consistent responsive spacing rhythm', () => {
  const styles = read('./design-system.css');
  const publication = read('../product/catalog-publication-panel.module.css');
  const homepage = read('../product/homepage-product-binding-panel.module.css');
  const commerce = read('../commerce/commerce.module.css');
  const publicationPanel = read('../product/catalog-publication-panel.tsx');
  const homepagePanel = read('../product/homepage-product-binding-panel.tsx');
  assert.match(styles, /\.av \.av-commerce-workspace\s*\{[\s\S]*?--alsvid-panel:\s*var\(--av-panel\)/);
  assert.match(styles, /--alsvid-text:\s*var\(--av-text\)/);
  assert.match(styles, /--alsvid-input:\s*var\(--av-panel\)/);
  assert.match(styles, /\.av \.av-commerce-workspace > section\s*\{\s*margin:\s*0/);
  assert.match(styles, /#homepage > section,[\s\S]*?#publications > section\s*\{[\s\S]*?margin:\s*0/);
  assert.match(styles, /#inventory \.av-cardhead\s*\{\s*flex-wrap:\s*wrap/);
  assert.match(styles, /\.av \.av-commerce-nav\s*\{\s*top:\s*64px/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.av \.av-commerce-workspace\s*\{\s*gap:\s*12px/);
  assert.match(publication, /margin:22px 0/);
  assert.match(homepage, /margin:24px 0/);
  assert.match(commerce, /margin:24px 0/);
  assert.match(publicationPanel, /符合基础筛选/);
  assert.match(publicationPanel, /models\.length/);
  assert.match(publicationPanel, /检查产品型号与类型/);
  assert.match(homepagePanel, /检查型号状态与产品类型/);
  assert.match(homepagePanel, /前往产品研发检查型号/);
  // Legacy component margins remain reusable outside Admin; the Admin shell
  // deliberately overrides them with its stronger scoped selectors.
});
