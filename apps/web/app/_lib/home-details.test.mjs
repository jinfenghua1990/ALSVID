import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getHomeDetail, homeDetails } from './home-details.ts';

test('every public concept destination has localized content and a local image', () => {
  const catalogs = ['zh', 'de', 'en'].map(locale => JSON.parse(readFileSync(new URL(`./i18n/${locale}.json`, import.meta.url), 'utf8')));
  assert.equal(Object.keys(homeDetails).length, 20);
  for (const [slug, detail] of Object.entries(homeDetails)) {
    assert.match(slug, /^[a-z0-9-]+$/);
    for (const catalog of catalogs) for (const key of [detail.title, detail.body, detail.alt, `detail.${detail.category}_body`]) assert.ok(catalog[key]?.trim(), `${slug}: ${key}`);
    assert.ok(readFileSync(new URL(`../../public/home/original/${detail.image}.webp`, import.meta.url)).length > 0);
  }
});
test('unknown and prototype property names never become public detail pages', () => {
  for (const slug of ['unknown', '__proto__', 'constructor', 'toString']) assert.equal(getHomeDetail(slug), undefined);
});

