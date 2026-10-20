import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const directory = path.dirname(fileURLToPath(import.meta.url));
const locales = Object.fromEntries(await Promise.all(["zh", "de", "en"].map(async (locale) => [
  locale,
  JSON.parse(await readFile(path.join(directory, `${locale}.json`), "utf8")),
])));

test("FC1 product copy has parity across all enabled WWW locales", () => {
  const expected = Object.keys(locales.en).sort();
  for (const [locale, catalog] of Object.entries(locales)) {
    assert.deepEqual(Object.keys(catalog).sort(), expected, `${locale} FC1 keys differ`);
    for (const [key, value] of Object.entries(catalog)) {
      assert.equal(typeof value, "string", `${locale}:${key} must be text`);
      assert.ok(value.trim().length > 0, `${locale}:${key} must not be empty`);
    }
  }
});

test("FC1 content distinguishes unapproved variants, colours and compliance claims", () => {
  for (const locale of ["zh", "de", "en"]) {
    const copy = locales[locale];
    assert.match(copy["fc1.spec.colour.value"], /待确认|未确认|nicht bestätigt|not confirmed|offen|pending|to confirm/i);
    assert.match(copy["fc1.spec.compliance.value"], /待确认|zu bestätigen|pending confirmation/i);
    assert.match(copy["fc1.config.belt.body"], /待确认|未确认|nicht bestätigt|not confirmed/i);
    assert.match(copy["fc1.colours.disclaimer"], /待确认|Bestätigung|nicht bestätigt|confirmation|unconfirmed/i);
  }
});

test("customer-facing FC1 source note omits the supplier brand and former model name", () => {
  for (const locale of ["zh", "de", "en"]) {
    assert.doesNotMatch(locales[locale]["fc1.source"], /naicisports|pilot\s*x9/i);
    assert.ok(locales[locale]["fc1.source.link"].trim().length > 0);
  }
});


test("preview checkout does not advertise Shopify or accept live payment", async () => {
  for (const [locale, copy] of Object.entries(locales)) {
    const relevant = ["fc1.cta.body", "fc1.selection.unavailable", "fc1.checkout.intro", "fc1.checkout.notice"];
    for (const key of relevant) assert.doesNotMatch(copy[key], /shopify/i, `${locale}:${key}`);
    assert.match(copy["fc1.selection.unavailable"], /不接受付款|不生成购买订单|keine Zahlung|no payment/i, locale);
    assert.ok(copy["fc1.checkout.disabled"]);
  }
  const files = ["../../../_components/product/fc1-product.tsx", "../../../_components/product/fc1-story-v4.tsx"];
  for (const file of files) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.equal(source.includes("ALSVID_SHOPIFY_FC1_PRODUCT_URL"), false);
    assert.equal(source.includes("shop.chaibenn.com"), false);
    assert.match(source, /fc1\.selection\.unavailable/);
    assert.ok(source.includes("/checkout"));
  }
});

test("checkout preview cannot submit an order or capture payment", async () => {
  const source = await readFile(path.join(directory, "../../../[locale]/checkout/page.tsx"), "utf8");
  assert.ok(source.includes('data-checkout-mode="preview-only"'));
  assert.ok(source.includes('disabled aria-disabled="true"'));
  assert.doesNotMatch(source, /<form|onSubmit=|paymentIntent|createOrder|createPayment/);
});

test("preview bag and checkout review remain local and non-transactional", async () => {
  for (const [locale, copy] of Object.entries(locales)) {
    for (const key of ["fc1.cart.add", "fc1.cart.view", "fc1.cart.order_review", "fc1.cart.no_purchase", "fc1.cart.price_pending"]) {
      assert.equal(typeof copy[key], "string", `${locale} missing ${key}`);
      assert.ok(copy[key].trim());
    }
  }
  const configurator = await readFile(path.join(directory, "../../../_components/product/fc1-colour-configurator.tsx"), "utf8");
  const cart = await readFile(path.join(directory, "../../../[locale]/cart/page.tsx"), "utf8");
  const checkout = await readFile(path.join(directory, "../../../[locale]/checkout/page.tsx"), "utf8");
  const panel = await readFile(path.join(directory, "../../../_components/product/fc1-preview-cart-panel.tsx"), "utf8");
  assert.match(configurator, /saveFc1PreviewCart/);
  assert.match(configurator, /\/cart/);
  assert.ok(cart.includes('data-cart-mode="preview-only"'));
  assert.match(checkout, /mode="checkout"/);
  assert.match(checkout, /disabled aria-disabled="true"/);
  assert.doesNotMatch(panel, /fetch\(|createOrder|paymentIntent|onSubmit/);
  assert.doesNotMatch(cart, /fetch\(|createOrder|paymentIntent|onSubmit/);
});
