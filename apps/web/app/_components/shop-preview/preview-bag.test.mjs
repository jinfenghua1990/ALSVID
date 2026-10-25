import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePreviewBag, previewBagKey } from './preview-bag.ts';

test('independent preview bag accepts only known model/version pairs and bounded quantities', () => {
  const valid = [{ model: 'fc1', version: 'pro', quantity: 2 }, { model: 'fc2', version: 'pending', quantity: 1 }];
  assert.deepEqual(parsePreviewBag(JSON.stringify(valid)), valid);
  for (const input of ['null', '{}', 'broken', '[{"model":"fc1","version":"pending","quantity":1}]',
    '[{"model":"fc2","version":"pro","quantity":1}]', '[{"model":"fc1","version":"pro","quantity":10}]',
    '[{"model":"fc1","version":"pro","quantity":1.5}]',
    JSON.stringify([valid[0], valid[0]])]) assert.deepEqual(parsePreviewBag(input), [], input);
  assert.equal(previewBagKey, 'alsvid-independent-shop-preview-v1');
});
