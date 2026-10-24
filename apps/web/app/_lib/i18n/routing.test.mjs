import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { preferredLocale, localizedPath, isLocale } from './routing.ts';

test('German is the default; explicit saved choices take precedence', () => {
  assert.equal(preferredLocale(undefined), 'de');
  assert.equal(preferredLocale('invalid'), 'de');
  assert.equal(preferredLocale(''), 'de');
  for (const locale of ['de', 'en', 'zh']) assert.equal(preferredLocale(locale), locale);
  assert.equal(isLocale('fr'), false);
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
