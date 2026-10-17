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
