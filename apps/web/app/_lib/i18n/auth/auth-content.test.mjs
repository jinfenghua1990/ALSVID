import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = locale => JSON.parse(readFileSync(new URL('./' + locale + '.json', import.meta.url), 'utf8'));
test('portal login catalogs have complete key and interpolation parity', () => {
  const en = read('en');
  for (const locale of ['zh','de']) {
    const catalog = read(locale);
    assert.deepEqual(Object.keys(catalog).sort(),Object.keys(en).sort(),locale);
    for (const key of Object.keys(en)) {
      assert.ok(catalog[key].trim(),key);
      assert.deepEqual((catalog[key].match(/\{\w+\}/g)||[]).sort(),(en[key].match(/\{\w+\}/g)||[]).sort(),locale+':'+key);
    }
  }
});
