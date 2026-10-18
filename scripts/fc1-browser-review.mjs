import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(process.env.FC1_PLAYWRIGHT_ROOT + "/package.json");
const { chromium } = require("playwright");
const base = process.env.FC1_REVIEW_URL || "http://127.0.0.1:3000";
const output = process.env.FC1_REVIEW_OUTPUT || ".tmp/fc1-v4-review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = { base, sha: process.env.FC1_REVIEW_SHA || "", checks: [], errors: [] };
const check = (name) => report.checks.push(name);
try {
  for (const locale of ["zh", "de", "en"]) {
    const copy = JSON.parse(await readFile("apps/web/app/_lib/i18n/fc1/" + locale + ".json", "utf8"));
    for (const [device, viewport] of [["desktop", { width:1440, height:1000 }], ["mobile", { width:390, height:844 }]]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const failures = [];
      page.on("pageerror", (error) => failures.push(error.message));
      const response = await page.goto(base + "/" + locale + "/explore/fc1", { waitUntil:"networkidle" });
      assert.equal(response.status(), 200);
      await page.locator('[data-fc1-version="4"]').waitFor();
      await page.locator('[data-fc1-motion="ready"]').waitFor();
      assert.equal(await page.locator('[aria-labelledby="feature-overview-title"] a').count(), 6);
      await page.screenshot({ path:output + "/" + locale + "-" + device + "-hero.png" });
      // Visit the complete story so lazy photography and heading reveals have been exercised.
      const sections = page.locator("[data-fc1-chapter]");
      for (let index=0; index<await sections.count(); index++) {
        await sections.nth(index).scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, locale + " " + device + " overflow");
      }
      const progress = await page.locator("[data-fc1-motion]").evaluate((node) => Number(node.style.getPropertyValue("--fc1-scroll-progress")));
      assert.ok(progress > 0.5, "reading progress must respond to scrolling");
      assert.equal(await page.locator('[data-fc1-chapter][data-fc1-revealed="false"]').count(), 0);
      const chapterNav = page.getByRole("navigation", { name:copy["fc1.highlights"], exact:true });
      await chapterNav.getByRole("link", { name:copy["fc1.story.nav.fold"], exact:true }).click();
      await page.waitForURL("**#folding");
      await page.waitForFunction(() => document.querySelector('nav a[href="#folding"][aria-current="location"]'));
      assert.equal(await chapterNav.locator('a[href="#folding"]').getAttribute("aria-current"), "location");
      const fold = page.locator("#folding");
      await fold.getByRole("button", { name:copy["fc1.fold.closed"], exact:true }).click();
      await page.waitForFunction(() => document.querySelector('#folding img')?.getAttribute("src")?.includes("folded-transparent-v3.png"));
      await fold.getByRole("button", { name:copy["fc1.fold.open"], exact:true }).click();
      await page.waitForFunction(() => document.querySelector('#folding img')?.getAttribute("src")?.includes("side-transparent-v3.png"));
      const configure = page.locator("#configure");
      const pro = configure.getByRole("button", { name:/FC1 Pro/ });
      await pro.click();
      assert.equal(await pro.getAttribute("aria-pressed"), "true");
      const colour = configure.getByRole("button", { name:copy["fc1.colours.blue"], exact:true });
      await colour.click();
      assert.equal(await colour.getAttribute("aria-pressed"), "true");
      const gallery = page.locator("#gallery");
      const names = ["side", "rear", "folded", "front", "shock", "chain", "controls"];
      for (const name of names) {
        await gallery.getByRole("button", { name:copy["fc1.gallery." + name], exact:true }).click();
        const image = gallery.getByRole("button", { name:copy["fc1.open_photo"], exact:true }).locator("img");
        await image.evaluate(async (img) => { await img.decode(); });
        assert.match(await image.getAttribute("src"), /-transparent-v3.png$/);
      }
      await gallery.getByRole("button", { name:copy["fc1.open_photo"], exact:true }).click();
      assert.equal(await gallery.locator("dialog").evaluate((node) => node.open), true);
      await page.keyboard.press("Escape");
      assert.equal(await gallery.locator("dialog").evaluate((node) => node.open), false);
      const specs = page.locator("#specifications");
      await specs.getByRole("button", { name:copy["fc1.filter.pending"], exact:true }).click();
      const statuses = await specs.locator("tbody tr").evaluateAll((rows) => rows.map((row) => row.dataset.status));
      assert.ok(statuses.length > 0 && statuses.every((status) => status === "pending"));
      await specs.getByRole("button", { name:copy["fc1.filter.all"], exact:true }).click();
      assert.equal(await specs.locator("tbody tr").count(), 20);
      const question = page.locator("#faq summary").first();
      await question.click();
      assert.equal(await page.locator("#faq details").first().evaluate((node) => node.open), true);
      await page.locator("#safety").scrollIntoViewIfNeeded();
      await page.screenshot({ path:output + "/" + locale + "-" + device + "-safety.png" });
      await page.locator("#overview").scrollIntoViewIfNeeded();
      await page.screenshot({ path:output + "/" + locale + "-" + device + "-full.png", fullPage:true });
      assert.deepEqual(failures, [], "browser errors");
      check(locale + " " + device + ": images, six chapters, overflow, fold, model, colour, gallery/lightbox, filters, FAQ");
      await context.close();
    }
  }
  // Narrow German labels, dynamic reduced motion, keyboard and no-JavaScript fallback.
  const context = await browser.newContext({ viewport:{ width:320, height:740 }, reducedMotion:"reduce" });
  const page = await context.newPage();
  await page.goto(base + "/de/explore/fc1", { waitUntil:"networkidle" });
  assert.equal(await page.locator("[data-fc1-motion]").count(), 0);
  assert.equal(await page.locator("#overview > img").evaluate((img) => getComputedStyle(img).transform), "none");
  await page.screenshot({ path:output + "/de-narrow-reduced-motion.png", fullPage:true });
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll("body *")).filter((node) => { const r=node.getBoundingClientRect(); return r.right > innerWidth+1 && r.width > 0 && !node.closest("table"); }).map((node) => ({ tag:node.tagName, class:node.className, right:node.getBoundingClientRect().right })).slice(0,20));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, JSON.stringify(overflow));
  await page.emulateMedia({ reducedMotion:"no-preference" });
  await page.locator('[data-fc1-motion="ready"]').waitFor();
  await page.emulateMedia({ reducedMotion:"reduce" });
  await page.waitForFunction(() => !document.querySelector("[data-fc1-motion]"));
  check("320px German + dynamic reduced-motion preference");
  await context.close();
  const plain = await browser.newContext({ javaScriptEnabled:false, viewport:{ width:390, height:844 } });
  const fallback = await plain.newPage();
  await fallback.goto(base + "/en/explore/fc1");
  assert.equal(await fallback.locator("h1").innerText(), "ALSVID FC1");
  assert.equal(await fallback.locator('[aria-labelledby="feature-overview-title"] a').count(), 6);
  assert.equal(await fallback.locator("[data-fc1-motion]").count(), 0);
  assert.equal(await fallback.locator("#specifications tbody tr").count(), 20);
  await fallback.screenshot({ path:output + "/en-no-javascript.png", fullPage:true });
  check("no-JavaScript content, chapter links and specifications");
  await plain.close();
  const classic = await browser.newPage();
  await classic.goto(base + "/en/explore/fc1?view=classic", { waitUntil:"networkidle" });
  assert.equal(await classic.locator('[data-fc1-version="4"]').count(), 0);
  assert.equal(await classic.locator("h1").innerText(), "ALSVID FC1");
  check("classic route retains original page");
  await classic.close();
} catch (error) {
  report.errors.push(error.stack || String(error));
  throw error;
} finally {
  await writeFile(output + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}
