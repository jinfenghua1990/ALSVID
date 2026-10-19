import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Reuse the temporary Playwright installation already provisioned by fc1-preview.yml.
const root = process.env.FC1_PLAYWRIGHT_ROOT;
if (!root) throw new Error('FC1_PLAYWRIGHT_ROOT is required: this check runs within the existing browser-preview workflow');
const { chromium } = createRequire(root + '/package.json')('playwright');
const base = (process.env.FC1_REVIEW_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const output = process.env.FC1_REVIEW_OUTPUT || '.tmp/fc1-v4-review';
const report = { sha: process.env.FC1_REVIEW_SHA || '', base, checks: [], errors: [] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const locale of ['de', 'en', 'zh']) {
    for (const [device, viewport] of [
      ['desktop', { width: 1440, height: 900 }],
      ['mobile', { width: 390, height: 844 }],
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        const browserErrors = [];
        page.on('pageerror', error => browserErrors.push(error.message));
        const response = await page.goto(base + '/' + locale + '/', { waitUntil: 'domcontentloaded' });
        assert.equal(response?.status(), 200, locale + ' homepage should return HTTP 200');
        const root = page.locator('main[data-home-design="original-migration"]');
        await root.waitFor({ state: 'visible', timeout: 15000 });
        await root.locator('header').first().waitFor({ state: 'attached' });
        const hero = root.locator(':scope > section').first();
        const tabs = hero.locator('[role="group"] button[aria-pressed]');
        assert.equal(await tabs.count(), 4, 'Keep all four platform scenes');
        assert.equal(await tabs.nth(0).getAttribute('aria-pressed'), 'true', 'Initial scene is selected');
        await tabs.nth(1).click();
        assert.equal(await tabs.nth(1).getAttribute('aria-pressed'), 'true', 'Manual platform selection works');
        assert.equal(await tabs.nth(0).getAttribute('aria-pressed'), 'false', 'Previous scene is deselected');
        assert.ok(await root.locator('[data-fc2-launch] a[href="/' + locale + '/explore/fc2"]').count() > 0, 'New model is discoverable from homepage');
        const title = hero.locator('h1');
        assert.ok((await title.innerText()).trim().length > 0, 'Hero retains readable headline');
        await page.screenshot({ path: output + '/official-' + locale + '-' + device + '.png' });
        assert.deepEqual(browserErrors, [], locale + ' ' + device + ' JS errors');
        report.checks.push(locale + ' ' + device + ': homepage, navigation, four scenes, manual tab switching');
      } finally {
        await context.close();
      }
    }
  }

  for (const locale of ['de','en','zh']) {
    for (const [device,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
      const context=await browser.newContext({viewport,reducedMotion:'reduce'});
      try {
        const page=await context.newPage();
        const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        const response=await page.goto(base+'/'+locale+'/explore/fc2',{waitUntil:'domcontentloaded'});
        assert.equal(response?.status(),200);
        const product=page.locator('main[data-fc2-product]');
        await product.waitFor({state:'visible'});
        assert.match(await product.locator('h1').innerText(),/FC2/);
        await page.waitForFunction(()=>{const image=document.querySelector('[data-fc2-gallery] img');return image?.complete&&image.naturalWidth>0;});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'FC2 must fit '+device+' viewport');
        assert.ok(await page.locator('link[rel="canonical"]').getAttribute('href')=== 'https://www.chaibenn.com/'+locale+'/explore/fc2');
        await page.screenshot({path:output+'/fc2-'+locale+'-'+device+'.png',fullPage:true});
        const gallery=product.locator('[data-fc2-gallery]');
        const controls=gallery.locator('button');
        await controls.nth(1).click();
        assert.equal(await controls.nth(1).getAttribute('aria-pressed'),'true');
        await gallery.locator('img[data-photo="folded"]').waitFor({state:'visible'});
        await page.waitForFunction(()=>{const image=document.querySelector('[data-photo="folded"]');return image?.complete&&image.naturalWidth>0;});
        await controls.nth(1).press('ArrowRight');
        assert.equal(await controls.nth(2).getAttribute('aria-pressed'),'true');
        assert.ok(await gallery.locator('img[data-photo="original"]').count()===1);
        const faq=product.locator('section').filter({has:page.locator('details')}).locator('details').first();
        await faq.locator('summary').click();
        assert.ok(await faq.evaluate(element=>element.open));
        const target=locale==='en'?'de':'en';
        await product.locator('header details summary').click();
        const languageLink=product.locator('header details a[hreflang="'+target+'"]');
        assert.equal(await languageLink.getAttribute('href'),'/'+target+'/explore/fc2');
        await languageLink.click();
        await page.waitForURL('**/'+target+'/explore/fc2');
        assert.ok((await context.cookies()).some(cookie=>cookie.name==='alsvid-locale'&&cookie.value===target));
        assert.deepEqual(errors,[]);
        report.checks.push(locale+' '+device+': FC2 route, optimized images, responsive width, gallery click and keyboard, FAQ, canonical and preserved language route');
      } finally { await context.close(); }
    }
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  await browser.close();
  await writeFile(output + '/official-homepage-report.json', JSON.stringify(report, null, 2) + '\n');
}
