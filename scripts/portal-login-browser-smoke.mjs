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
    for (const portal of ['admin','dealer','supplier','my']) {
      const passwordEnabled = ['admin','dealer','supplier'].includes(portal);
      const context = await browser.newContext({ viewport:{ width:1440,height:960 },reducedMotion:'reduce' });
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
      await page.route('**/api/session/password-reset/request', async route => {
        const body = route.request().postDataJSON();
        assert.equal(body.portal,portal);
        assert.equal(body.locale,locale);
        assert.equal(body.email,'reset-'+portal+'@example.test');
        await route.fulfill({json:{data:{ok:true}}});
      });
      await page.goto(base + '/' + locale + '/login?portal=' + portal);
      const root = page.locator('[data-portal-login="' + portal + '"]');
      await root.waitFor();
      if(portal==='dealer')assert.equal(await root.locator('a[href="https://www.alsvidbike.com/'+locale+'/dealers?apply=1"]').count(),1,'dealer login links to the application dialog');
      const action = root.getByRole('button',{name:copy['auth.'+portal+'.entry'],exact:true});
      const initial = await root.locator('h1').boundingBox();
      assert.equal(await root.locator('input[name=email]').count(),1);
      assert.equal(await root.locator('input[name=email]').isVisible(),false);
      await action.focus();
      await root.locator('[inert]').waitFor({state:'detached'});
      const final = await root.locator('h1').boundingBox();
      assert.ok(initial && final && final.width < initial.width,'Hero shrinks when opening');
      assert.ok(final.width > initial.width * .65,'Hero remains large enough to read');
      assert.equal(await root.locator('input[name=email]').isVisible(),true);

      if (passwordEnabled) {
        assert.equal(await root.getByRole('button',{name:copy['auth.password_method'],exact:true}).count(),1);
        assert.equal(await root.locator('input[name=password]').count(),1,'Password field is available for internal portals');
      } else {
        assert.equal(await root.getByRole('button',{name:copy['auth.password_method'],exact:true}).count(),0,'My ALSVID stays email-code only');
        assert.equal(await root.locator('input[name=password]').count(),0);
      }

      await root.getByRole('button',{name:copy['auth.forgot'],exact:true}).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.locator('input[name=resetEmail]').fill('reset-'+portal+'@example.test');
      await dialog.getByRole('button',{name:copy['auth.reset_send'],exact:true}).click();
      await dialog.getByRole('status').waitFor();
      assert.ok((await dialog.getByRole('status').innerText()).length > 5);
      await dialog.getByRole('button',{name:copy['auth.reset_close'],exact:true}).click();

      if (passwordEnabled) await root.getByRole('button',{name:copy['auth.email_method'],exact:true}).click();
      const email = root.locator('input[name=email]');
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
      assert.equal(await root.locator('input[name=password]').inputValue(),'','New password must not reuse the previous email');
      assert.equal(await root.locator('input[name=confirmPassword]').inputValue(),'','Confirmation must not reuse the previous code');
      assert.equal(await root.getByRole('button',{name:copy['auth.close'],exact:true}).count(),0,'Mandatory password setup cannot be dismissed');
      assert.equal(await root.getByRole('button',{name:copy['auth.save_password'],exact:true}).count(),1,'Only one submit CTA');
      assert.equal(await page.getByText(/Shopify/i).count(),0);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
      assert.deepEqual(errors,[]);
      await page.screenshot({path:output+'/'+locale+'-'+portal+'-1440.png',fullPage:true});
      await context.close();
    }
  }

  // Dealer links from the public partnership page explicitly open the login form on arrival.
  for (const locale of ['zh','en','de']) {
    const context = await browser.newContext({ viewport:{ width:1440,height:960 }, reducedMotion:'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(base + '/login?portal=dealer&locale=' + locale + '&open=1');
      const root = page.locator('[data-portal-login="dealer"]');
      await root.waitFor();
      assert.equal(await root.getAttribute('data-open'), 'true', locale + ' dealer login link opens the designed form on arrival');
      assert.equal(await root.locator('input[name=email]').isVisible(), true, locale + ' dealer email field is immediately visible');
    } finally { await context.close(); }
  }

  const mobileContext = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const mobilePage = await mobileContext.newPage();
  const enCopy = JSON.parse(readFileSync('apps/web/app/_lib/i18n/auth/en.json', 'utf8'));
  await mobilePage.goto(base+'/en/login?portal=supplier');
  const mobileRoot = mobilePage.locator('[data-portal-login="supplier"]');
  await mobileRoot.waitFor();
  await mobileRoot.getByRole('button',{name:enCopy['auth.supplier.entry'],exact:true}).focus();
  await mobileRoot.locator('[inert]').waitFor({state:'detached'});
  await mobileRoot.getByRole('button',{name:enCopy['auth.forgot'],exact:true}).click();
  await mobilePage.getByRole('dialog').waitFor();
  assert.ok(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Reset modal fits mobile viewport');
  await mobilePage.screenshot({path:output+'/en-supplier-reset-mobile.png',fullPage:true});
  await mobileContext.close();

  const resetContext = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const resetPage = await resetContext.newPage();
  await resetPage.goto(base+'/reset-password?portal=dealer&locale=de');
  await resetPage.getByRole('dialog').waitFor();
  assert.match(resetPage.url(),/forgot=1/,'A direct no-token reset URL opens the inline forgot-password dialog');
  assert.equal(await resetPage.locator('[data-portal-login="dealer"]').count(),1);
  await resetContext.close();

  const context = await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'no-preference'});
  const page = await context.newPage();
  await page.goto(base+'/en/login?portal=dealer');
  const root = page.locator('[data-portal-login=dealer]');
  const action = root.getByRole('button',{name:'Dealer sign in',exact:true});
  await action.focus();
  await root.locator('h1').click();
  await root.locator('button[aria-expanded=true]').hover();
  await page.waitForFunction(()=>Number(document.querySelector('[data-wheel-speed]')?.getAttribute('data-wheel-speed'))>.9);
  await root.locator('h1').click();
  await page.waitForFunction(()=>Number(document.querySelector('[data-wheel-speed]')?.getAttribute('data-wheel-speed'))<.25);
  assert.equal(await root.getAttribute('data-open'),'true');
  await context.close();
} finally { await browser.close(); }
