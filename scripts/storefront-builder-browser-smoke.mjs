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

const auth = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/v1/auth/me' && request.headers.authorization === 'Bearer storefront-builder-ci') {
    response.end(JSON.stringify({
      data: {
        userId: 'ci-storefront-editor',
        email: 'storefront-editor@example.invalid',
        displayName: 'CI Storefront Editor',
        roles: ['system_admin'],
        permissions: [],
      },
    }));
  } else {
    response.statusCode = 401;
    response.end('{}');
  }
});

await new Promise((resolve, reject) => {
  auth.once('error', reject);
  auth.listen(4000, resolve);
});

const browser = await chromium.launch({ headless: true });
const report = { sha: process.env.FC1_REVIEW_SHA, checks: [] };

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(base + '/admin/ecommerce/page-builder');
  await page.waitForURL(/\/login\?/);
  report.checks.push('dedicated editor route remains protected when unauthenticated');

  await context.addCookies([{
    name: 'alsvid_session',
    value: 'storefront-builder-ci',
    url: base,
    httpOnly: true,
  }]);

  await page.goto(base + '/admin/ecommerce/page-builder');
  await page.getByRole('heading', { name: '商城首页装修' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: '导出装修方案' }).waitFor();
  await page.getByRole('button', { name: '桌面端' }).waitFor();
  await page.getByRole('button', { name: '手机端' }).waitFor();
  await page.locator('.gjs-cv-canvas').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByText('主视觉横幅', { exact: true }).waitFor({ timeout: 15000 });

  assert.equal(await page.getByText('独立装修窗口', { exact: true }).count(), 1);
  assert.equal(await page.getByText('导出 HTML', { exact: true }).count(), 1);
  assert.deepEqual(errors, [], 'storefront editor must not produce browser runtime errors');

  await page.screenshot({ path: path.join(output, 'storefront-builder.png'), fullPage: true });
  report.checks.push('Chinese editor loads, draggable modules and canvas are visible');
  report.checks.push('export, device preview, and safe-draft messaging are visible');
  await writeFile(path.join(output, 'storefront-builder-browser-report.json'), JSON.stringify(report, null, 2));
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => auth.close(resolve));
}
