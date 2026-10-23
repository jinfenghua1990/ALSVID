import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { preferredLocale, localizedPath, isLocale } from './routing.ts';

test('explicit preference wins; browser recommendations respect language weights', () => {
  assert.equal(preferredLocale('en', 'de-DE'), 'en');
  assert.equal(preferredLocale(undefined, 'fr-FR,en-US;q=0.8,de;q=0.2'), 'en');
  assert.equal(preferredLocale('invalid', 'en;q=0,de;q=0.8'), 'de');
  assert.equal(preferredLocale(undefined, 'nl'), 'en');
  assert.equal(preferredLocale(undefined, ''), 'en');
  assert.equal(isLocale('fr'), false);
  assert.equal(preferredLocale('zh', 'de'), 'zh');
  assert.equal(preferredLocale(undefined, 'zh-CN,en;q=0.9'), 'zh');
});
test('switching language preserves nested page, query and fragment', () => {
  assert.equal(localizedPath('/de/models/fc1?campaign=one#details', 'en'), '/en/models/fc1?campaign=one#details');
  assert.equal(localizedPath('/', 'en'), '/en/');
  assert.equal(localizedPath('//external.test', 'de'), '/de/');
});
test('all released catalog entries exist in both languages and retain placeholders', () => {
  const en = JSON.parse(readFileSync(new URL('./en.json', import.meta.url), 'utf8'));
  const de = JSON.parse(readFileSync(new URL('./de.json', import.meta.url), 'utf8'));
  const zh = JSON.parse(readFileSync(new URL('./zh.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  for (const key of Object.keys(en)) {
    assert.ok(en[key].trim() && de[key].trim() && zh[key].trim(), key);
    assert.deepEqual(en[key].match(/\{\w+\}/g), zh[key].match(/\{\w+\}/g), key);
    assert.deepEqual(en[key].match(/\{\w+\}/g), de[key].match(/\{\w+\}/g), key);
  }
});
