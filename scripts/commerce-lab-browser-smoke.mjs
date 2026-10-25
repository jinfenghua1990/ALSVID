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
  const lab = page.locator('[data-commerce-lab]');
  await lab.waitFor();
  await page.getByText('更多模块', { exact: true }).click();
  assert.equal(await page.locator('a[href="/admin/commerce-lab"]').count() > 0, true);
  await page.getByText('更多模块', { exact: true }).click();
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
