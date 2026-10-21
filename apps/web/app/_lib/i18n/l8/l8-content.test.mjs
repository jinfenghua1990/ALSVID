import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalogs = await Promise.all(["en", "de", "zh"].map(async locale =>
  [locale, JSON.parse(await readFile(new URL("./" + locale + ".json", import.meta.url), "utf8"))]));
test("L8 translations have complete, nonempty keys and matching interpolation in all public locales", () => {
  const baseline = catalogs[0][1];
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [locale, copy] of catalogs) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(baseline).sort(), locale);
    for (const key of Object.keys(baseline)) {
      assert.equal(typeof copy[key], "string");
      assert.ok(copy[key].trim(), locale + ":" + key);
      assert.deepEqual(placeholders(copy[key]), placeholders(baseline[key]), locale + ":" + key);
    }
  }
});
