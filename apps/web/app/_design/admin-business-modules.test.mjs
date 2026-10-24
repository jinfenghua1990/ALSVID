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
  assert.ok(registry.includes("href: '/admin/orders'"), 'Ardot order workspace remains a top-level navigation entry');
  assert.match(ui, /const AREAS = ADMIN_MODULES/);
  assert.match(ui, /legacyAreas\.includes\(area\)/);
  assert.match(ui, /商城促销与支付配置|营销活动（待接入）/);
});

test('ecommerce has a dedicated workbench and distinct real workflow routes', () => {
  const ecommerce = read('./ecommerce-admin-workspace.tsx');
  const route = read('../admin/ecommerce/[section]/page.tsx');
  const product = read('../product/product-client.tsx');
  assert.match(ecommerce, /view === 'overview'/);
  assert.match(ecommerce, /<HomepageProductBindingPanel models=\{models\} loadError=""/);
  assert.match(ecommerce, /<CatalogPublicationPanel models=\{models\} \/>/);
  assert.match(ecommerce, /<EcommerceInventoryPanel \/>/);
  assert.match(ecommerce, /<StorefrontOrderDraftPanel mode="pricing" \/>/);
  assert.match(ecommerce, /<StorefrontOrderDraftPanel mode="orders" \/>/);
  for (const section of ['publications', 'homepage', 'inventory', 'pricing', 'orders'])
    assert.ok(route.includes(section), 'dedicated ecommerce route: ' + section);
  const stock = read('./ecommerce-inventory-panel.tsx');
  assert.match(stock, /\/api\/control\/v1\/inventory/);
  assert.match(stock, /row\.item_kind === 'SKU'/);
  assert.match(stock, /row\.item_kind === 'VEHICLE'/);
  assert.match(stock, /二者分别展示，不能叠加算总库存/);
  assert.match(stock, /库存未知，不代表缺货或零库存/);
  assert.match(stock, /台账可用量不等于商城可售量/);
  assert.doesNotMatch(stock, /method:\s*'POST'/);
  assert.match(read('./renderer.tsx'), /'电商库存查询': '\/admin\/ecommerce\/inventory'/);
  assert.match(read('./renderer.tsx'), /<IntegratedOperations area=\{screen\.area\} route=\{screen\.route\} \/>/);
  assert.doesNotMatch(product, /<HomepageProductBindingPanel models=/);
  assert.doesNotMatch(product, /<CatalogPublicationPanel models=/);
  assert.match(read('../_lib/admin-sku-pricing-navigation.ts'), /\/admin\/ecommerce\/pricing\?/);
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

test('framework directory has a single source of 13 Admin modules and does not present mocked KPI records', () => {
  const source = read('./business-module-registry.ts');
  const directory = read('./admin-module-directory.tsx');
  const ui = read('./renderer.tsx');
  const labels = [...source.matchAll(/\{ label: '([^']+)', href: '(\/admin[^']*)'/g)];
  assert.equal(labels.length, 13, 'exactly thirteen top-level modules');
  assert.equal(new Set(labels.map(match => match[1])).size, 13, 'module labels are unique');
  assert.equal(new Set(labels.map(match => match[2])).size, 13, 'module routes are unique');
  assert.match(directory, /ADMIN_MODULES\.map\(/);
  assert.match(directory, /部分功能接入/);
  assert.match(ui, /<AdminModuleDirectory \/>/);
  assert.match(ui, /!isIntegratedOverview && !isLiveProductRoot \? <div className="av-railgroup">/);
  assert.doesNotMatch(directory, /api\/control|const exampleKpi/);
});


test('ecommerce workbench is action-oriented and unfinished capabilities stay explicit', () => {
  const workspace = read('./ecommerce-admin-workspace.tsx');
  const styles = read('./design-system.css');
  assert.match(workspace, /ALSVID COMMERCE OPERATIONS/);
  assert.match(workspace, /av-commerce-shortcut-grid/);
  assert.match(workspace, /可售库存 ATP/);
  assert.match(workspace, /公开结账与 PSP 支付/);
  assert.match(workspace, /促销与优惠券/);
  assert.match(workspace, /待开发/);
  assert.match(workspace, /台账可用量不等于商城可售量/);
  assert.match(styles, /\.av-commerce-shortcut-grid/);
  assert.match(styles, /\.av-commerce-roadmap-compact/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.doesNotMatch(workspace, /fake|mock KPI|模拟订单数量/i);
});

test('embedded ecommerce sections inherit the Admin theme and use consistent responsive spacing', () => {
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
  assert.match(styles, /\.av-commerce-shortcut-grid\s*\{/);
  assert.match(styles, /\.av-body--ecommerce \.av-railitem\[data-active="true"\]/);
  assert.match(styles, /@media\(max-width:720px\)/);
  assert.match(publication, /margin:22px 0/);
  assert.match(homepage, /margin:24px 0/);
  assert.match(commerce, /margin:24px 0/);
  assert.match(publicationPanel, /符合基础筛选/);
  assert.match(publicationPanel, /models\.length/);
  assert.match(publicationPanel, /检查产品型号与类型/);
  assert.match(homepagePanel, /检查型号状态与产品类型/);
  assert.match(homepagePanel, /前往产品研发检查型号/);
});




test('product sidebar links to live sections without permanently highlighting models', () => {
  const ui = read('./renderer.tsx');
  const styles = read('./design-system.css');
  const product = read('../product/product-client.tsx');
  for (const anchor of ['product-types', 'series', 'model-register', 'models', 'engineering', 'parts']) {
    assert.ok(product.includes('id="' + anchor + '"'), 'product section exists: ' + anchor);
  }
  assert.ok(ui.includes("'产品类型': '/admin/product#product-types'"));
  assert.ok(ui.includes("'官网商品发布与审核', '首页商品绑定'"));
  assert.ok(!styles.includes('.av-body--product .av-railitem[href="/admin/product#model-register"]'));
});


test('integrated Admin order hub links to existing real business workspaces without demo records', () => {
  const ui = read('./renderer.tsx');
  assert.match(ui, /aria-label="订单业务入口"/);
  for (const href of ['/admin/ecommerce/orders', '/admin/dealers/purchase/fulfillment', '/admin/production', '/admin/inventory']) {
    assert.ok(ui.includes('href="' + href + '"'), href);
  }
  assert.match(ui, /<IntegratedOperations area=\{screen\.area\} route=\{screen\.route\} \/>/);
  assert.ok(!ui.includes('Ardot 页面内容参考（设计示例数据）'));
});
