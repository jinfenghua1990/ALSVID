import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../../[locale]/bikes/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../[locale]/bikes/page.module.css", import.meta.url), "utf8");
const discovery = readFileSync(new URL("./bikes-discovery.tsx", import.meta.url), "utf8");
const catalogs = ["zh", "de", "en"].map(locale => JSON.parse(readFileSync(new URL("../../_lib/i18n/catalog/" + locale + ".json", import.meta.url), "utf8")));

test("bike collection places the model catalogue before editorial platform cards", () => {
  assert.ok(page.indexOf('aria-labelledby="models-title"') < page.indexOf('aria-labelledby="platforms-title"'));
  assert.match(page, /data-bikes-catalog="1"/);
  assert.match(page, /<BikesDiscovery locale=\{locale\} models=\{filteredModels\} sortMode=\{sortMode\}/);
  assert.match(discovery, /matching\.map\(model => <article className=\{styles\.modelCard\}/);
  assert.match(discovery, /data-bikes-search/);
  assert.match(discovery, /data-bikes-color-preview/);
  assert.match(discovery, /data-bikes-compare/);
});

test("collection supports platform filtering, sorting and accessible active states", () => {
  assert.match(page, /catalog\.bikes\.sort\.featured/);
  assert.match(page, /catalog\.bikes\.sort\.name/);
  assert.match(page, /aria-current=\{sortMode === "name" \? "page" : undefined\}/);
  assert.match(styles, /\.discovery \.modelGrid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(page, /BikesModelSideNavigator title=\{t\("catalog\.bikes\.modelNav\.series"\)\} links=\{modelSideLinks\}/);
  assert.match(page, /const modelSideLinks = models\.map/);
});

test("catalog sort labels exist for Chinese, German and English", () => {
  for (const catalog of catalogs) {
    for (const key of ["catalog.bikes.sort.label", "catalog.bikes.sort.results", "catalog.bikes.sort.featured", "catalog.bikes.sort.name", "catalog.discovery.search.label", "catalog.discovery.compare.title"]) {
      assert.equal(typeof catalog[key], "string", key);
      assert.ok(catalog[key].length > 0, key);
    }
  }
});


test("catalog columns follow the available collection width, not just the viewport", () => {
  assert.match(styles, /\.discovery\{container-name:alsvid-bike-cards;container-type:inline-size\}/);
  assert.match(styles, /@container alsvid-bike-cards \(max-width:960px\)/);
  assert.match(styles, /@container alsvid-bike-cards \(max-width:600px\)/);
  assert.match(styles, /\.discovery \.modelImageLink\{flex:none;width:100%;aspect-ratio:4\/3;/);
  assert.match(styles, /\.discovery \.discoveryActions>a\.detailLink\{flex:1 1 100%/);
  assert.match(styles, /\.discovery a:focus-visible,\.discovery button:focus-visible/);
});
