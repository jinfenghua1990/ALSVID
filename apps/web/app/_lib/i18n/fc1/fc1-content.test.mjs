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

test("FC1 copy keeps unapproved variants, colours and compliance claims explicit", () => {
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

test("FC1 clearly offers email reservation only, with a safe missing-email fallback", async () => {
  for (const [locale, copy] of Object.entries(locales)) {
    for (const key of ["fc1.reservation.cta", "fc1.reservation.pending", "fc1.reservation.note", "fc1.reservation.email_subject", "fc1.reservation.email_body"]) {
      assert.equal(typeof copy[key], "string", `${locale} missing ${key}`);
      assert.ok(copy[key].trim());
    }
    assert.doesNotMatch(copy["fc1.selection.unavailable"], /checkout|Warenkorb|购物袋/i);
  }
  const configurator = await readFile(path.join(directory, "../../../_components/product/fc1-colour-configurator.tsx"), "utf8");
  assert.match(configurator, /NEXT_PUBLIC_FC1_RESERVATION_EMAIL/);
  assert.match(configurator, /onSubmit=\{submitReservation\}/);
  assert.match(configurator, /\/api\/public\/fc1-reservation/);
  assert.match(configurator, /type="email"/);
  assert.match(configurator, /disabled=\{!reservationEmailConfigured/);
  assert.doesNotMatch(configurator, /mailto:/);
  assert.match(configurator, /fc1\.reservation\.pending/);
  assert.doesNotMatch(configurator, /saveFc1PreviewCart|fc1\.cart\.|\/cart|\/checkout/);
});

test("FC1 story and product layouts contain no cart or checkout CTA", async () => {
  for (const file of ["../../../_components/product/fc1-product.tsx", "../../../_components/product/fc1-story-v4.tsx"]) {
    const source = await readFile(path.join(directory, file), "utf8");
    assert.equal(source.includes("ALSVID_SHOPIFY_FC1_PRODUCT_URL"), false);
    assert.equal(source.includes("shop.chaibenn.com"), false);
    assert.match(source, /fc1\.reservation\.note/);
    assert.equal(source.includes('href={`/${locale}/checkout'), false);
    assert.equal(source.includes('href={`/${locale}/cart'), false);
  }
});

test("legacy cart and checkout URLs redirect back to FC1 reservation configuration", async () => {
  const cart = await readFile(path.join(directory, "../../../[locale]/cart/page.tsx"), "utf8");
  const checkout = await readFile(path.join(directory, "../../../[locale]/checkout/page.tsx"), "utf8");
  assert.ok(cart.includes("redirect(`/${locale}/explore/fc1#configure`)"));
  assert.ok(checkout.includes("redirect(`/${locale}/explore/fc1#configure`)"));
  assert.doesNotMatch(cart + checkout, /Fc1PreviewCartPanel|paymentIntent|createOrder|onSubmit|<form/);
});

test("FC1 public preview copy does not claim paid preorder, stock or Shopify checkout", async () => {
  for (const [locale, copy] of Object.entries(locales)) {
    assert.ok(copy["hero.poster_buy"].length > 0);
    assert.doesNotMatch(copy["hero.poster_buy"], /立即预订|Pre-order now|Jetzt vorbestellen/i, locale);
    assert.doesNotMatch(copy["fc1.faq.7.a"], /Shopify|checkout|在线购买已开放|Jetzt kaufen/i, locale);
    assert.ok(copy["fc1.selection.model_note"].length > 0);
  }
  const base = path.join(directory, "../");
  for (const locale of ["zh", "de", "en"]) {
    const globalCopy = JSON.parse(await readFile(path.join(base, locale + ".json"), "utf8"));
    assert.doesNotMatch(globalCopy["commerce.body"], /Shopify/i);
    assert.doesNotMatch(globalCopy["detail.accessory_body"], /Shopify/i);
  }
  const configurator = await readFile(path.join(directory, "../../../_components/product/fc1-colour-configurator.tsx"), "utf8");
  assert.doesNotMatch(configurator, /fetch\("\/api\/public\/fc1-colour-interest"/);
  assert.doesNotMatch(configurator, /copy\.soldOut|setSaveState|saveFc1PreviewCart/);
  assert.match(configurator, /copy\.proposal/);
  const css = await readFile(path.join(directory, "../../../_components/product/fc1-product.module.css"), "utf8");
  assert.match(css, /\.interestSpecs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
