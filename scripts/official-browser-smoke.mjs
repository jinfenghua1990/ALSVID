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
          ? headerNav.locator(':scope > nav > a:not([data-site-cart]), :scope > nav > button[class*="mobileLink"]')
          : headerNav.locator(':scope > a, :scope > button[class*="navLink"]');
        assert.equal(await navLinks.count(), 8, 'Approved product/dealer/owner/story navigation exists');
        assert.equal(await root.locator('header [data-site-cart]').count(),2,'Desktop and mobile shopping-bag entries coexist');
        assert.equal(await navLinks.nth(0).getAttribute('href'), '/' + locale + '/explore/fc1', 'FC1 must come before FC2');
        assert.equal(await navLinks.nth(1).getAttribute('href'), '/' + locale + '/explore/fc2', 'FC2 model links to its own page');
        assert.equal(await navLinks.nth(2).getAttribute('href'), '/' + locale + '/explore/l7', 'L7 has a global model entry');
        assert.equal(await navLinks.nth(3).getAttribute('href'), '/' + locale + '/explore/l8', 'L8 has a global model entry');
        assert.equal(await navLinks.nth(4).getAttribute('href'), '/' + locale + '/bikes', 'Products link to bicycle catalog');
        assert.equal(await navLinks.nth(5).getAttribute('href'), '/' + locale + '/dealers', 'Dealers follow the unified product center');
        const dealerLabel = { de: 'Händler weltweit', en: 'Global dealers', zh: '全球经销商' }[locale];
        const ownerLabel = { de: 'Service', en: 'Owner services', zh: '车主服务' }[locale];
        assert.equal((await navLinks.nth(5).innerText()).trim(), dealerLabel, 'Global dealers follow the unified product center');
        assert.equal((await navLinks.nth(6).innerText()).trim(), ownerLabel, 'Owner services follows global dealers');
        assert.equal(await navLinks.nth(7).getAttribute('href'), '/' + locale + '/explore/about-story', 'Brand story follows owner services');
        assert.equal(await navLinks.nth(6).getAttribute('aria-haspopup'), 'dialog', 'Owner services opens a choice dialog');
        await navLinks.nth(6).click();
        const ownerDialog = page.getByRole('dialog');
        await ownerDialog.waitFor({ state: 'visible' });
        assert.ok(await ownerDialog.locator('a[href="/' + locale + '/service-locations"]').count(), 'Service option stays on verified public service directory');
        const ownerHref = await ownerDialog.locator('a').first().getAttribute('href');
        const ownerDestination = new URL(ownerHref, base);
        const publicOwnerPortal = ownerDestination.hostname === 'my.alsvidbike.com';
        const localOwnerPortal = ['127.0.0.1', 'localhost'].includes(ownerDestination.hostname) && ownerDestination.pathname === '/my';
        assert.ok(publicOwnerPortal || localOwnerPortal,
          'Owner option leads to My ALSVID in production and preserves the local /my portal route in browser previews');
        await ownerDialog.locator('button').first().click();
        await ownerDialog.waitFor({ state: 'hidden' });
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
        assert.equal(await bicycles.locator('a[href="/' + locale + '/explore/l7"]').count() > 0, true, 'L7 detail link exists');
        assert.equal(await bicycles.locator('a[href="/' + locale + '/explore/l8"]').count() > 0, true, 'L8 detail link exists');
        assert.equal(await bicycles.locator('#models article').count(), 4, 'The catalogue includes FC1, FC2, L7 and L8 model previews');
        const modelNavigator = bicycles.locator('nav[data-bikes-model-nav]');
        await modelNavigator.waitFor({ state: 'visible', timeout: 8000 });
        assert.equal(await modelNavigator.count(), 1, 'Sticky category navigation is present from the top of the page');
        assert.equal(await modelNavigator.locator('a').count(), 3, 'Sticky category navigation links to models, platforms and accessories');
        const modelSideNavigator = bicycles.locator('nav[data-bikes-model-side-nav]');
        assert.equal(await modelSideNavigator.count(), 1, 'Model series appear in the left-side in-flow index');
        assert.equal(await modelSideNavigator.locator('a').count(), 4, 'Left model index links to FC1, FC2, L7 and L8');
        assert.equal(await modelNavigator.evaluate(element => getComputedStyle(element).position), 'sticky',
          'Product navigation stays in the document flow and sticks below the global header');
        assert.equal(await bicycles.locator('header[data-public-site-header]').evaluate(element => getComputedStyle(element).position), 'sticky',
          'Global header and cart remain visible while scrolling');
        await modelSideNavigator.locator('a[data-nav-target="model-fc1"]').click();
        await bicycles.waitForFunction(() => location.hash === '#model-fc1' && new URLSearchParams(location.search).get('platform') === 'fc');
        await bicycles.waitForFunction(() =>
          document.querySelector('nav[data-bikes-model-side-nav] a[data-nav-target="model-fc1"]')?.getAttribute('aria-current') === 'location');
        await modelSideNavigator.locator('a[data-nav-target="model-fc2"]').click();
        await bicycles.waitForFunction(() => location.hash === '#model-fc2');
        await bicycles.waitForFunction(() =>
          document.querySelector('nav[data-bikes-model-side-nav] a[data-nav-target="model-fc2"]')?.getAttribute('aria-current') === 'location');
        await bicycles.waitForFunction(() => {
          const header = document.querySelector('header[data-public-site-header]')?.getBoundingClientRect();
          const nav = document.querySelector('nav[data-bikes-model-nav]')?.getBoundingClientRect();
          const target = document.querySelector('#model-fc2')?.getBoundingClientRect();
          return Boolean(header && nav && target &&
            Math.abs(header.top) < 1 &&
            Math.abs(nav.top - header.bottom) < 2 &&
            target.top >= 110 && target.top <= 165);
        }, { timeout: 8000 });
        assert.ok(await bicycles.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          'Sticky product navigation fits the viewport');
        await bicycles.screenshot({ path: output + '/bikes-nav-' + locale + '-' + device + '.png' });

        assert.ok(await bicycles.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Bicycle catalog should not overflow at ' + device);
        const gtResponse = await bicycles.goto(base + '/' + locale + '/bikes?platform=gt#models', { waitUntil: 'domcontentloaded' });
        assert.equal(gtResponse?.status(), 200, 'Platform filter loads');
        assert.equal(await bicycles.locator('#models article').count(), 0, 'Unconfirmed GT bikes do not appear as real listings');
        assert.equal(await bicycles.locator('nav[data-bikes-model-nav] a').count(), 3, 'The sticky category navigation remains available');
        assert.equal(await bicycles.locator('nav[data-bikes-model-side-nav] a').count(), 4, 'The left model index remains available when a platform has no models');
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

        // Cart phase one: the configured FC1 selection survives navigation, but cannot be purchased.
        const shopping=await context.newPage();
        const cartResponse=await shopping.goto(base+'/'+locale+'/cart',{waitUntil:'domcontentloaded'});
        assert.equal(cartResponse?.status(),200,'Cart is a real accessible page');
        assert.equal(await shopping.locator('main[data-storefront-cart="cart"]').count(),1);
        assert.equal(await shopping.locator('main[data-storefront-cart="cart"] article').count(),0,'Empty cart starts with zero lines');
        await shopping.goto(base+'/'+locale+'/explore/fc1#configure',{waitUntil:'domcontentloaded'});
        const purchase=shopping.locator('[data-product-purchase="fc1"]');
        await purchase.waitFor({state:'visible',timeout:15000});
        assert.equal(await purchase.locator('button').count(),2,'Detail page exposes add and buy controls');
        assert.equal(await purchase.locator('button').nth(1).isDisabled(),true,'Buy now is gated until PSP, SKU and price readiness');
        await purchase.locator('button').first().click();
        await purchase.locator('a[href="/'+locale+'/cart"]').waitFor({state:'visible'});
        await shopping.waitForFunction(() => {
          const badges = [...document.querySelectorAll('header [data-site-cart] strong')];
          return badges.length === 2 && badges.every(node => node.textContent?.trim() === '1');
        });
        const cartWithItem=await shopping.goto(base+'/'+locale+'/cart',{waitUntil:'domcontentloaded'});
        assert.equal(cartWithItem?.status(),200);
        await shopping.locator('main[data-storefront-cart="cart"] article').first().waitFor();
        assert.equal(await shopping.locator('main[data-storefront-cart="cart"] article').count(),1,'Configured FC1 persists into cart');
        await shopping.locator('main[data-storefront-cart="cart"] article button[aria-label]').last().click();
        await shopping.waitForFunction(()=>document.querySelector('main[data-storefront-cart="cart"] strong[aria-live="polite"]')?.textContent==="2");
        await shopping.waitForFunction(() => {
          const badges = [...document.querySelectorAll('header [data-site-cart] strong')];
          return badges.length === 2 && badges.every(node => node.textContent?.trim() === '2');
        });
        const checkoutResponse=await shopping.goto(base+'/'+locale+'/checkout',{waitUntil:'domcontentloaded'});
        assert.equal(checkoutResponse?.status(),200);
        assert.equal(await shopping.locator('main[data-storefront-cart="checkout"] button:disabled').count(),1,'No live payment is possible');
        assert.equal(await shopping.locator('main[data-storefront-cart="checkout"] article').count(),1,'Order preview retains chosen selection');
        await shopping.goto(base+'/'+locale+'/explore/fc2',{waitUntil:'domcontentloaded'});
        const fc2Selection=shopping.locator('[data-preview-selection="fc2"]');
        await fc2Selection.waitFor({state:'visible'});
        assert.equal(await fc2Selection.locator('button:disabled').count(),1,'FC2 buy now is blocked without approved price and SKU');
        await fc2Selection.locator('button:not(:disabled)').click();
        await shopping.waitForFunction(()=>{const badges=[...document.querySelectorAll('header [data-site-cart] strong')];return badges.length===2 && badges.every(node=>node.textContent?.trim()==='3');});
        await shopping.goto(base+'/'+locale+'/explore/accessory-basket',{waitUntil:'domcontentloaded'});
        const accessorySelection=shopping.locator('[data-preview-selection="accessory-basket"]');
        await accessorySelection.waitFor({state:'visible'});
        assert.equal(await accessorySelection.locator('button:disabled').count(),1,'Unverified accessory purchase stays disabled');
        await accessorySelection.locator('select').selectOption('2');
        await accessorySelection.locator('button:not(:disabled)').click();
        await shopping.waitForFunction(()=>{const badges=[...document.querySelectorAll('header [data-site-cart] strong')];return badges.length===2 && badges.every(node=>node.textContent?.trim()==='5');});
        await shopping.goto(base+'/'+locale+'/cart',{waitUntil:'domcontentloaded'});
        await shopping.locator('main[data-storefront-cart="cart"] article').first().waitFor();
        assert.equal(await shopping.locator('main[data-storefront-cart="cart"] article').count(),3,'Cart retains FC1, FC2 and accessory interests');
        assert.equal(await shopping.locator('article[data-cart-product="FC2"]').count(),1);
        assert.equal(await shopping.locator('article[data-cart-product="ACCESSORY"]').count(),1);
        assert.equal(await shopping.locator('main[data-storefront-cart="cart"] button:disabled').count(),2,'No payment and minimum quantity controls stay gated');
        await shopping.goto(base+'/'+locale+'/checkout',{waitUntil:'domcontentloaded'});
        assert.equal(await shopping.locator('main[data-storefront-cart="checkout"] article').count(),3,'Unpriced mixed selections appear in checkout preview');
        assert.equal(await shopping.locator('main[data-storefront-cart="checkout"] button:disabled').count(),1,'Real checkout remains blocked');
        assert.ok(await shopping.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Cart and product pages do not overflow');
        report.checks.push(locale+' '+device+': FC1/FC2/accessory preview cart, quantity badge and disabled checkout');
        await shopping.close();


        const hero = root.locator(':scope > section').first();
        const mobileModels = root.locator('header > nav').nth(1);
        if (isMobile) {
          assert.ok(await mobileModels.isVisible(), 'All four model shortcuts must be visible in the top mobile header');
          const modelLinks = mobileModels.locator('a');
          assert.equal(await modelLinks.count(), 4, 'All four model shortcuts are visible outside the hamburger menu');
          assert.equal(await modelLinks.nth(0).getAttribute('href'), '/' + locale + '/explore/fc1');
          assert.equal(await modelLinks.nth(1).getAttribute('href'), '/' + locale + '/explore/fc2');
          assert.equal(await modelLinks.nth(2).getAttribute('href'), '/' + locale + '/explore/l7');
          assert.equal(await modelLinks.nth(3).getAttribute('href'), '/' + locale + '/explore/l8');
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
            'All model shortcuts must align horizontally with logo and Menu');
          const lastLinkBox = await modelLinks.nth(3).boundingBox();
          assert.ok(lastLinkBox && Math.abs(linkBox.y - lastLinkBox.y) < 4 &&
            linkBox.x >= wordmarkBox.x + wordmarkBox.width - 2 &&
            lastLinkBox.x + lastLinkBox.width <= menuBox.x + 2,
            'All four models fit between wordmark and Menu with no overlap');
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
        // The scene image is replaced on tab selection. Decode it before taking
        // the visual snapshot so a fast screenshot cannot hide a missing/late image.
        const activeHeroImage = hero.locator('img').first();
        const loadedHeroImage = await activeHeroImage.evaluate(async image => {
          await image.decode();
          return { width: image.naturalWidth, height: image.naturalHeight, source: image.currentSrc || image.src };
        });
        assert.ok(loadedHeroImage.width > 0 && loadedHeroImage.height > 0,
          'Selected homepage scene must have a successfully decoded image before visual review');
        assert.ok(loadedHeroImage.source.includes('scene-city.webp'),
          'Second homepage scene should load the city riding image');
        if (isMobile) {
          const copyTop = await hero.locator('h1').evaluate(element => Number.parseFloat(getComputedStyle(element.parentElement).top));
          const imagePosition = await activeHeroImage.evaluate(image => getComputedStyle(image).objectPosition);
          assert.ok(copyTop <= 70, 'Mobile hero copy should remain in the top safe area above the rider');
          assert.ok(imagePosition.startsWith('51%'), 'Mobile hero crop should preserve the full bicycle focal area');
        }
        assert.ok(await root.locator('[data-fc2-launch] a[href="/' + locale + '/explore/fc2"]').count() > 0, 'New model is discoverable from homepage');
        const title = hero.locator('h1');
        assert.ok((await title.innerText()).trim().length > 0, 'Hero retains readable headline');
        await page.screenshot({ path: output + '/official-' + locale + '-' + device + '.png' });
        assert.deepEqual(browserErrors, [], locale + ' ' + device + ' JS errors');
        const accessoryCatalogLinks = page.locator('a[data-accessories-catalog-link]');
        assert.equal(await accessoryCatalogLinks.count(), 2, 'Homepage and footer accessory overview links are present');
        assert.deepEqual(await accessoryCatalogLinks.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))),
          ['/' + locale + '/bikes#accessories','/' + locale + '/bikes#accessories'],
          'Homepage accessory calls-to-action open the unified product and accessories catalogue');
        report.checks.push(locale + ' ' + device + ': homepage, navigation, four scenes, manual tab switching and catalogue entry');
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
