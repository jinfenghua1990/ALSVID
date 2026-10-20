import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(process.env.PORTAL_PLAYWRIGHT_ROOT + '/package.json')('playwright');

const base = process.env.PORTAL_UI_BASE_URL ?? 'http://127.0.0.1:3000';
const output = process.env.PORTAL_UI_OUTPUT ?? '/tmp/portal-login-artifacts';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless:true });
try {
  for (const locale of ['zh','en','de']) {
    const copy = JSON.parse(readFileSync('apps/web/app/_lib/i18n/auth/' + locale + '.json', 'utf8'));
    for (const portal of ['admin','dealer','my']) {
      for (const width of [1440,390]) {
        const context = await browser.newContext({ viewport:{ width,height:960 },reducedMotion:'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/api/session/email/start', async route => {
          assert.equal(route.request().postDataJSON().portal,portal);
          await route.fulfill({json:{data:{expiresAt:'2030-01-01T00:00:00Z'}}});
        });
        await page.route('**/api/session/email/complete', async route => {
          assert.equal(route.request().postDataJSON().code,'123456');
          assert.equal(route.request().postDataJSON().portal,portal);
          await route.fulfill({json:{data:{passwordSetupRequired:true}}});
        });
        await page.goto(base + '/' + locale + '/login?portal=' + portal);
        const root = page.locator('[data-portal-login="' + portal + '"]');
        await root.waitFor();
        const action = root.getByRole('button',{name:copy['auth.'+portal+'.entry'],exact:true});
        const initial = await root.locator('h1').boundingBox();
        assert.equal(await root.locator('input[name=email]').count(),1);
        assert.equal(await root.locator('input[name=email]').isVisible(),false);
        await action.focus();
        await root.locator('[inert]').waitFor({state:'detached'});
        const final = await root.locator('h1').boundingBox();
        assert.ok(initial && final && final.width < initial.width,'Hero shrinks when opening');
        assert.ok(final.width > initial.width * .65,'Hero remains large enough to read');
        const email = root.getByRole('textbox').first();
        await email.fill('portal-ui@example.test');
        assert.equal(await email.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
        await root.locator('h1').click();
        assert.equal(await root.getAttribute('data-open'),'true','Leaving the button does not close the form');
        await root.getByRole('button',{name:copy['auth.send_code'],exact:true}).click();
        const code = root.locator('input[name=code]');
        await code.waitFor();
        await code.fill('123456');
        await root.getByRole('button',{name:copy['auth.verify'],exact:true}).click();
        await root.locator('input[name=confirmPassword]').waitFor();
        assert.equal(await root.getByRole('button',{name:copy['auth.close'],exact:true}).count(),0,'Mandatory password setup cannot be dismissed');
        assert.equal(await root.getByRole('button',{name:copy['auth.save_password'],exact:true}).count(),1,'Only one submit CTA');
        assert.equal(await page.getByText(/Shopify/i).count(),0);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
        assert.deepEqual(errors,[]);
        await page.screenshot({path:output+'/'+locale+'-'+portal+'-'+width+'.png',fullPage:true});
        await context.close();
      }
    }
  }
  const context = await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'no-preference'});
  const page = await context.newPage();
  await page.goto(base+'/en/login?portal=dealer');
  const root = page.locator('[data-portal-login=dealer]');
  const action = root.getByRole('button',{name:'Dealer sign in',exact:true});
  await action.hover();
  await page.waitForFunction(()=>Number(document.querySelector('[data-wheel-speed]')?.getAttribute('data-wheel-speed'))>.9);
  await root.locator('h1').click();
  await page.waitForFunction(()=>Number(document.querySelector('[data-wheel-speed]')?.getAttribute('data-wheel-speed'))<.25);
  assert.equal(await root.getAttribute('data-open'),'true');
  await context.close();
} finally { await browser.close(); }
