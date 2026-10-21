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
      ['compact-mobile', { width: 320, height: 720 }],
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

        const isMobile = device !== 'desktop';
        const headerNav = isMobile
          ? root.locator('header > details').first()
          : root.locator('header > nav').first();
        if (isMobile) await headerNav.locator('summary').click();
        const navLinks = isMobile
          ? headerNav.locator(':scope > nav > a')
          : headerNav.locator(':scope > a');
        assert.equal(await navLinks.count(), 6, 'Approved product/dealer/owner/story navigation exists');
        assert.equal(await navLinks.nth(0).getAttribute('href'), '/' + locale + '/explore/fc1', 'FC1 must come before FC2');
        assert.equal(await navLinks.nth(1).getAttribute('href'), '/' + locale + '/explore/fc2', 'FC2 model links to its own page');
        assert.equal(await navLinks.nth(2).getAttribute('href'), '/' + locale + '/bikes', 'Products link to bicycle catalog');
        assert.equal(await navLinks.nth(3).getAttribute('href'), '/' + locale + '/dealers', 'Dealers follow the unified product center');
        const dealerLabel = { de: 'Händler weltweit', en: 'Global dealers', zh: '全球经销商' }[locale];
        const ownerLabel = { de: 'Service', en: 'Owner services', zh: '车主服务' }[locale];
        assert.equal((await navLinks.nth(3).innerText()).trim(), dealerLabel, 'Global dealers follow the unified product center');
        assert.equal((await navLinks.nth(4).innerText()).trim(), ownerLabel, 'Owner services follows global dealers');
        assert.equal(await navLinks.nth(5).getAttribute('href'), '/' + locale + '/explore/about-story', 'Brand story follows owner services');
        const reserveBadge = navLinks.nth(0).locator('span');
        const newBadge = navLinks.nth(1).locator('span');
        assert.ok((await reserveBadge.innerText()).trim(), 'FC1 reservation badge is localized');
        assert.ok((await newBadge.innerText()).trim(), 'FC2 new badge is localized');
        assert.equal(await reserveBadge.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(184, 233, 134)');
        assert.equal(await newBadge.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(230, 83, 75)');
        if (!isMobile) {
          assert.equal(await navLinks.nth(0).evaluate(element => getComputedStyle(element).fontSize), '18px');
        } else {
          assert.equal(await headerNav.locator('nav a[hreflang]').count(), 3, 'All language options remain accessible inside Menu');
          await headerNav.locator('summary').click();
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Navigation must not cause horizontal overflow');
        const bicycles = await context.newPage();
        const bicyclesResponse = await bicycles.goto(base + '/' + locale + '/bikes', { waitUntil: 'domcontentloaded' });
        assert.equal(bicyclesResponse?.status(), 200, locale + ' bicycle catalog should return HTTP 200');
        assert.equal(await bicycles.locator('main[data-bikes-catalog]').count(), 1, 'Bicycle catalog renders');
        assert.equal(await bicycles.locator('a[href="/' + locale + '/explore/fc1"]').count() > 0, true, 'FC1 detail link exists');
        assert.equal(await bicycles.locator('a[href="/' + locale + '/explore/fc2"]').count() > 0, true, 'FC2 detail link exists');
        const modelNavigator = bicycles.locator('nav[data-bikes-model-nav]');
        assert.equal(await modelNavigator.count(), 0, 'Floating navigator stays hidden over the hero');
        await bicycles.locator('#model-fc1').scrollIntoViewIfNeeded();
        await modelNavigator.waitFor({ state: 'visible', timeout: 8000 });
        assert.equal(await modelNavigator.locator('a').count(), 2, 'Only the FC1 and FC2 models have quick links');
        await bicycles.waitForFunction(() =>
          document.querySelector('nav[data-bikes-model-nav] a[href="#model-fc1"]')?.getAttribute('aria-current') === 'location');
        await modelNavigator.locator('a[href="#model-fc2"]').click();
        await bicycles.waitForFunction(() => location.hash === '#model-fc2');
        await bicycles.waitForFunction(() =>
          document.querySelector('nav[data-bikes-model-nav] a[href="#model-fc2"]')?.getAttribute('aria-current') === 'location');
        assert.ok(await bicycles.locator('#model-fc2').evaluate(node => node.getBoundingClientRect().top >= 45),
          'Floating navigation does not obscure the FC2 title');
        assert.ok(await bicycles.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          'Floating navigation fits the viewport');
        await bicycles.screenshot({ path: output + '/bikes-nav-' + locale + '-' + device + '.png' });

        assert.ok(await bicycles.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Bicycle catalog should not overflow at ' + device);
        const gtResponse = await bicycles.goto(base + '/' + locale + '/bikes?platform=gt#models', { waitUntil: 'domcontentloaded' });
        assert.equal(gtResponse?.status(), 200, 'Platform filter loads');
        assert.equal(await bicycles.locator('#models article').count(), 0, 'Unconfirmed GT bikes do not appear as real listings');
        assert.equal(await bicycles.locator('nav[data-bikes-model-nav]').count(), 0, 'Do not link to unpublished models');
        await bicycles.close();
        // The public catalog has a single product center with two categories.
        const accessories = await context.newPage();
        const accessoriesResponse = await accessories.goto(base + '/' + locale + '/accessories', {waitUntil:'domcontentloaded'});
        assert.equal(accessoriesResponse?.status(), 200, 'Legacy accessories URL redirects to a live product center');
        assert.equal(new URL(accessories.url()).pathname, '/' + locale + '/bikes', 'Legacy accessories route has no separate visual page');
        assert.equal(await accessories.locator('section[data-accessories-catalog="1"]').count(), 1, 'Combined product center renders accessories');
        assert.equal(await accessories.locator('section[data-accessories-catalog="1"] article').count(), 5, 'Product center includes five accessory categories');
        assert.equal(await accessories.locator('main[data-bikes-catalog="1"]').count(), 1, 'Accessories are under the shared products page');
        assert.equal(await accessories.locator('header a[href="/' + locale + '/accessories"]').count(), 0, 'Separate accessories top-level nav is removed');
        const rackResponse = await accessories.goto(base + '/' + locale + '/accessories?category=rack', {waitUntil:'domcontentloaded'});
        assert.equal(rackResponse?.status(), 200, 'Legacy category filter redirects successfully');
        assert.equal(new URL(accessories.url()).pathname, '/' + locale + '/bikes');
        assert.equal(new URL(accessories.url()).searchParams.get('category'), 'rack', 'Legacy filters are preserved');
        assert.equal(await accessories.locator('section[data-accessories-catalog="1"] article').count(), 1, 'Rack filter shows only its category');
        assert.ok(await accessories.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Merged product center has no horizontal overflow');
        await accessories.close();

        const hero = root.locator(':scope > section').first();
        const mobileModels = root.locator('header > nav').nth(1);
        if (isMobile) {
          assert.ok(await mobileModels.isVisible(), 'FC1 reservation and FC2 new must be visible in the top mobile header');
          const modelLinks = mobileModels.locator('a');
          assert.equal(await modelLinks.count(), 2, 'The two visible model shortcuts are not hidden in the hamburger menu');
          assert.equal(await modelLinks.nth(0).getAttribute('href'), '/' + locale + '/explore/fc1');
          assert.equal(await modelLinks.nth(1).getAttribute('href'), '/' + locale + '/explore/fc2');
          assert.equal(await modelLinks.nth(0).locator('span').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(184, 233, 134)');
          assert.equal(await modelLinks.nth(1).locator('span').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(230, 83, 75)');
          const headerBox = await root.locator('header').first().boundingBox();
          const linkBox = await modelLinks.nth(0).boundingBox();
          const wordmarkBox = await root.locator('header a').first().boundingBox();
          const menuBox = await headerNav.locator('summary').boundingBox();
          assert.ok(headerBox && linkBox && wordmarkBox && menuBox && headerBox.height <= 70,
            'Header must be a single compact row, including logo and menu');
          assert.ok(Math.abs(wordmarkBox.y + wordmarkBox.height / 2 - linkBox.y - linkBox.height / 2) < 15 &&
            Math.abs(menuBox.y + menuBox.height / 2 - linkBox.y - linkBox.height / 2) < 15,
            'FC1/FC2 must align horizontally with logo and Menu');
          const secondLinkBox = await modelLinks.nth(1).boundingBox();
          assert.ok(secondLinkBox && Math.abs(linkBox.y - secondLinkBox.y) < 4 &&
            linkBox.x >= wordmarkBox.x + wordmarkBox.width - 2 &&
            secondLinkBox.x + secondLinkBox.width <= menuBox.x + 2,
            'FC1 and FC2 fit between wordmark and Menu with no overlap');
          const heroTitleBox = await hero.locator('h1').boundingBox();
          assert.ok(heroTitleBox && headerBox && heroTitleBox.y > headerBox.y + headerBox.height,
            'Hero heading must clear the taller mobile header');
        } else {
          assert.equal(await mobileModels.isVisible(), false, 'Do not duplicate quick links on desktop');
        }
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
        assert.ok(await page.locator('link[rel="canonical"]').getAttribute('href')=== 'https://www.alsvidbike.com/'+locale+'/explore/fc2');
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
        if (device === 'desktop') {
          await product.locator('header details[class*="switcher"] summary').click();
        } else {
          await product.locator('header > details summary').click();
        }
        const languageLink=product.locator('header a[hreflang="'+target+'"]:visible').first();
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
