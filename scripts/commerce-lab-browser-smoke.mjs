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
  const entry = primary.getByRole('link', { name: '商城方案对比', exact: true });
  assert.equal(await entry.count(), 1, 'independent catalog has one primary menu entry');
  await entry.waitFor({ state: 'visible' });
  assert.equal(await entry.getAttribute('aria-current'), 'page');
  assert.equal(await primary.locator('details a[href="/admin/commerce-lab"]').count(), 0, 'entry is not hidden under More');
  assert.equal(await primary.getByRole('link', { name: '电商', exact: true }).getAttribute('href'), '/admin/ecommerce');
  const moreButton = primary.getByRole('button', { name: '更多模块', exact: true });
  await moreButton.click();
  const morePanel = page.getByRole('dialog', { name: '更多业务模块', exact: true });
  await morePanel.waitFor({ state: 'visible' });
  assert.equal(await moreButton.getAttribute('aria-expanded'), 'true');
  assert.equal(await morePanel.getByRole('link').count(), 6, 'all six non-primary modules must be reachable');
  assert.equal(await morePanel.evaluate(panel => panel.parentElement === document.body), true, 'dropdown must escape the scrolling topbar');
  for (const href of ['/admin/dealers', '/admin/supply', '/admin/customers', '/admin/finance', '/admin/analytics', '/admin/settings']) {
    assert.equal(await morePanel.locator('a[href="' + href + '"]').count(), 1, 'More module route: ' + href);
  }
  await page.keyboard.press('Escape');
  await morePanel.waitFor({ state: 'hidden' });
  assert.equal(await moreButton.getAttribute('aria-expanded'), 'false');
  await moreButton.click();
  await morePanel.locator('a[href="/admin/finance"]').click();
  await page.waitForURL(base + '/admin/finance');
  assert.equal(await page.getByRole('navigation', { name: '一级导航', exact: true }).getByRole('button', { name: '更多模块', exact: true }).getAttribute('data-active'), 'true');
  await page.goto(base + '/admin/commerce-lab');
  await page.locator('[data-commerce-lab-overview]').waitFor();
  report.checks.push('More Modules popup opens over scroll nav, closes with Escape and routes to finance');

  const secondary = page.getByRole('complementary', { name: '二级导航', exact: true });
  const catalogLink = secondary.getByRole('link', { name: '独立商品管理', exact: true });
  const catalogHref = new URL(await catalogLink.getAttribute('href'), base);
  assert.equal(catalogHref.pathname, '/admin/commerce-lab/catalog');
  assert.equal(catalogHref.searchParams.get('alsvidMenuLabel'), '独立商品管理');
  assert.ok(catalogHref.searchParams.get('alsvidMenu'), 'secondary menu identity is preserved for a distinct workspace tab');
  report.checks.push('comparison is a direct primary menu with its own secondary layout; original ecommerce entry preserved');
  await page.screenshot({ path: path.join(output, 'commerce-lab-overview-desktop.png'), fullPage: true });
  await secondary.getByRole('link', { name: '旧版交互样机', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/admin/commerce-lab/reference' && url.searchParams.get('alsvidMenuLabel') === '旧版交互样机');
  const lab = page.locator('[data-commerce-lab]');
  await lab.waitFor();
  assert.equal(await primary.getByRole('link', { name: '商城方案对比', exact: true }).getAttribute('aria-current'), 'page');
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

  await page.reload(); await lab.waitFor();
  await lab.getByRole('button', { name: '中文后台预览', exact: true }).click();
  await lab.getByRole('button', { name: '订单管理 (0)', exact: true }).click();
  await lab.getByRole('heading', { name: '还没有演示单', exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'commerce-lab-admin-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'commerce-lab-admin-mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile page fits viewport');
  report.checks.push('reload clears demo data; desktop/mobile views render');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  await writeFile(path.join(output, 'commerce-lab-report.json'), JSON.stringify(report, null, 2));
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => auth.close(resolve));
}
