import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const root = process.env.FC1_PLAYWRIGHT_ROOT;
if (!root) throw new Error("FC1_PLAYWRIGHT_ROOT is required");
const { chromium } = createRequire(root + "/package.json")("playwright");
const base = (process.env.FC1_REVIEW_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const output = process.env.FC1_REVIEW_OUTPUT || ".tmp/fc1-v4-review";
const report = { sha: process.env.FC1_REVIEW_SHA || "", checks: [], errors: [] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const locale of ["zh", "de", "en"]) {
    for (const [device, viewport] of [
      ["desktop", { width: 1440, height: 900 }],
      ["mobile", { width: 390, height: 844 }],
      ["compact", { width: 320, height: 720 }],
    ]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        const response = await page.goto(base + "/" + locale + "/", { waitUntil: "domcontentloaded" });
        assert.equal(response?.status(), 200);
        const header = page.locator("[data-public-site-header]");
        for (const model of ["l7", "l8"]) {
          const link = header.locator('a[href="/' + locale + '/explore/' + model + '"]:visible').first();
          assert.ok(await link.isVisible(), model + " is visible in the top navigation");
          assert.equal((await link.innerText()).trim(), model.toUpperCase());
        }
        if (device !== "desktop") {
          const models = header.locator('nav[class*="mobileModels"] a');
          assert.equal(await models.count(), 4);
          for (const link of await models.all()) assert.ok(await link.evaluate(el => el.scrollWidth <= el.clientWidth + 1), "Mobile model labels fit");
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Homepage fits viewport");
        await header.screenshot({ path: output + "/model-header-" + locale + "-" + device + ".png" });
        assert.equal(await page.locator("[data-l7-launch]").count(), 1);
        await header.locator('a[href="/' + locale + '/explore/l7"]:visible').first().click();
        await page.waitForURL("**/" + locale + "/explore/l7");
        const product = page.locator('[data-l7-product="1"]');
        await product.waitFor();
        assert.equal(await product.locator('header a[aria-current="page"]:visible').first().innerText(), "L7");
        assert.match(await product.locator("h1").innerText(), /ALSVID\s*L7/);
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.alsvidbike.com/" + locale + "/explore/l7");
        const gallery = product.locator("[data-l7-gallery]");
        await gallery.locator("button").nth(1).focus();
        await gallery.locator("button").nth(1).press("Enter");
        await page.waitForFunction(() => { const image = document.querySelector('[data-l7-photo="folded"]'); return image?.complete && image.naturalWidth > 0; });
        assert.equal(await gallery.locator("button").nth(1).getAttribute("aria-pressed"), "true");
        await gallery.locator("button").nth(0).click();
        assert.equal(await product.locator("#specifications dl > div").count(), 12);
        assert.equal(await product.locator('section a[href*="checkout"],section a[href*="reserve"]').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "L7 fits viewport");
        await page.waitForFunction(() => { const image = document.querySelector('[data-l7-photo="side"]'); return image?.complete && image.naturalWidth > 0; });
        await page.screenshot({ path: output + "/l7-top-" + locale + "-" + device + ".png" });
        if (device === "desktop") await page.locator('header details[class*="switcher"] summary').click();
        else await page.locator("header > details summary").click();
        const target = locale === "en" ? "de" : "en";
        await page.locator('header a[hreflang="' + target + '"]:visible').first().click();
        await page.waitForURL("**/" + target + "/explore/l7");
        const catalog = await page.goto(base + "/" + locale + "/bikes#accessories", { waitUntil: "domcontentloaded" });
        assert.equal(catalog?.status(), 200);
        const cup = page.locator('[data-accessory-product="cup-holder"]');
        assert.equal(await cup.count(), 1);
        await cup.locator("a").last().click();
        await page.waitForURL("**/" + locale + "/explore/accessory-cup-holder");
        await page.locator('[data-cup-holder-product="1"]').waitFor();
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.alsvidbike.com/" + locale + "/explore/accessory-cup-holder");
        const cupGallery = page.locator("[data-cup-holder-gallery]");
        await cupGallery.locator("button").nth(1).focus();
        await cupGallery.locator("button").nth(1).press("Enter");
        await page.waitForFunction(() => { const image = document.querySelector('[data-cup-holder-gallery] img'); return image?.src.includes("cream") && image.complete && image.naturalWidth > 0; });
        assert.equal(await cupGallery.locator("button").nth(1).getAttribute("aria-pressed"), "true");
        assert.equal(await page.locator('[data-cup-holder-product] a[href*="checkout"],[data-cup-holder-product] a[href*="reserve"]').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Cup holder fits viewport");
        await page.screenshot({ path: output + "/cup-holder-top-" + locale + "-" + device + ".png" });
        assert.deepEqual(errors, []);
        report.checks.push(locale + " " + device + ": visible L7/L8 top links, four mobile models fit, L7 navigation/gallery/specs/locale, accessory catalog link, cup gallery and responsive width");
      } finally { await context.close(); }
    }
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.stack || error.message : String(error));
  throw error;
} finally {
  await browser.close();
  await writeFile(output + "/new-products-browser-report.json", JSON.stringify(report, null, 2) + "\n");
}
