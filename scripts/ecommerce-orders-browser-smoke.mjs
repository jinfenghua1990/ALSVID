import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Browser fixtures run only on disposable CI');
const { chromium } = createRequire(path.join(process.env.FC1_PLAYWRIGHT_ROOT, 'package.json'))('playwright');
const base = 'http://127.0.0.1:3000';
const output = process.env.FC1_REVIEW_OUTPUT || '.tmp/fc1-v4-review';
const auth = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/v1/auth/me' && request.headers.authorization === 'Bearer order-review-ci') {
    response.end(JSON.stringify({ data: { userId: 'ci-orders', email: 'ci@example.invalid', displayName: 'CI', roles: ['system_admin'], permissions: [] } }));
  } else {
    response.statusCode = 401;
    response.end('{}');
  }
});
await new Promise((resolve, reject) => { auth.once('error', reject); auth.listen(4000, '127.0.0.1', resolve); });
await mkdir(output, { recursive: true });

const order = {
  id: 'ci-order', orderNumber: 'ALS-CI-001', customerEmail: 'buyer@example.invalid',
  marketCountry: 'DE', currency: 'EUR', status: 'DRAFT', paymentStatus: 'NOT_CONFIGURED',
  totalGrossAmount: '2000.00', totalTaxAmount: '319.33', totalNetAmount: '1680.67', version: 1,
  createdAt: '2026-10-29T10:00:00Z', blockers: [], lines: [{
    id: 'line-1', skuId: 'sku-1', skuCode: 'F8-BLACK', skuName: 'F8 黑色',
    quantity: 2, unitPriceGross: '1000.00', lineGrossAmount: '2000.00',
    lineNetAmount: '1680.67', lineTaxAmount: '319.33', taxRateBasisPoints: 1900,
  }],
};
let summaries = 0;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addCookies([{ name: 'alsvid_session', value: 'order-review-ci', url: base, httpOnly: true }]);
  await page.route('**/api/control/v1/commerce/storefront/summary**', async route => {
    summaries++;
    const params = new URL(route.request().url()).searchParams;
    const matching = (!params.get('status') || params.get('status') === order.status)
      && (!params.get('marketCountry') || params.get('marketCountry') === order.marketCountry)
      && (!params.get('query') || (order.orderNumber + ' ' + order.lines[0].skuCode).toLowerCase().includes(params.get('query').toLowerCase()));
    await route.fulfill({ json: { data: {
      checkoutEnabled: false, skus: [], prices: [], factories: [], orders: matching ? [order] : [],
      orderTotal: matching ? 1 : 0, orderLimit: 100, orderStatusCounts: { DRAFT: 1 },
    } } });
  });
  await page.route('**/api/control/v1/commerce/storefront/orders/ci-order', route =>
    route.fulfill({ json: { data: { ...order, events: [] } } }));

  await page.goto(base + '/admin/ecommerce/orders');
  const workspace = page.locator('#b2c');
  const list = workspace.getByRole('region', { name: '订单列表' });
  await list.getByText('ALS-CI-001').waitFor({ timeout: 30000 });
  await list.getByText('F8 黑色').waitFor();
  await list.getByText('1000.00 EUR').waitFor();
  assert.equal(await list.locator('table thead th').count(), 6, 'the list uses table headings');
  assert.equal(await list.locator('article').count(), 0, 'orders are not rendered as cards');
  const settled = summaries;
  await page.waitForTimeout(1300);
  assert.equal(summaries, settled, 'idle order pages must not repeatedly fetch summaries');
  await page.screenshot({ path: path.join(output, 'ecommerce-orders-table.png'), fullPage: true });

  await list.getByRole('button', { name: /已取消/ }).click();
  await list.getByText('当前没有符合筛选条件的订单').waitFor();
  assert.equal(await list.locator('table thead th').count(), 6, 'empty results retain the headings');
  await list.getByRole('button', { name: '重置' }).click();
  await list.getByText('ALS-CI-001').waitFor();
  await list.getByRole('searchbox').fill('F8-BLACK');
  const searchRequest = page.waitForRequest(request => request.url().includes('query=F8-BLACK'));
  await list.getByRole('button', { name: '查询' }).click();
  await searchRequest;
  await page.waitForFunction(() => document.querySelector('#b2c [aria-busy="false"]'));
  await list.getByText('F8 黑色').waitFor();

  await list.getByRole('button', { name: '订单详情' }).click();
  await workspace.getByRole('heading', { name: '订单详情 · ALS-CI-001' }).waitFor();
  assert.deepEqual(errors, [], 'order workspace must not produce browser errors');
  console.log('Order table, filters, details and idle request regression passed');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => auth.close(resolve));
}
