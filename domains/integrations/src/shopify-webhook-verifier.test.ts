import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { createShopifyWebhookVerifier } from './index.js';

test('Shopify verifier accepts HMAC for the exact raw request bytes', () => {
  const secret = 'shopify-secret';
  const raw = Buffer.from('{"id":123,"name":"#1001"}', 'utf8');
  const signature = createHmac('sha256', secret).update(raw).digest('base64');
  const verifier = createShopifyWebhookVerifier(secret);

  assert.equal(verifier.verify(raw, signature), true);
  assert.equal(verifier.verify(Buffer.from('{"id":123, "name":"#1001"}', 'utf8'), signature), false);
});

test('Shopify verifier rejects missing, malformed and wrong signatures', () => {
  const verifier = createShopifyWebhookVerifier('shopify-secret');
  const raw = Buffer.from('{}', 'utf8');

  assert.equal(verifier.verify(raw, ''), false);
  assert.equal(verifier.verify(raw, 'not-the-signature'), false);
  const wrong = createHmac('sha256', 'wrong-secret').update(raw).digest('base64');
  assert.equal(verifier.verify(raw, wrong), false);
});
