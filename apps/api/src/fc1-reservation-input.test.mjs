import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('./fc1-reservation-input.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});
const module = { exports: {} };
runInNewContext(outputText, { module, exports: module.exports });
const { normalizeReservationEnquiry, reservationNotification } = module.exports;

test('rejects malformed input without throwing or exposing an unbounded email', () => {
  for (const value of [null, undefined, 'hello', [], {}, { email: 12 }, { email: 'not-email' },
    { email: 'a@example.com\nBcc:attacker@example.org' }, { email: 'x'.repeat(255) + '@example.com' }]) {
    assert.equal(normalizeReservationEnquiry(value), null);
  }
});

test('normalizes legitimate customer input and caps untrusted display fields', () => {
  const result = normalizeReservationEnquiry({
    email: '  CUSTOMER@EXAMPLE.COM ',
    model: 'P'.repeat(120),
    colour: 'C'.repeat(120),
    locale: 'de',
  });
  assert.equal(result.email, 'customer@example.com');
  assert.equal(result.model.length, 40);
  assert.equal(result.colour.length, 60);
  assert.equal(result.locale, 'de');
});

test('mail notification HTML escapes all user-controlled fields', () => {
  const input = normalizeReservationEnquiry({
    email: 'customer@example.com',
    model: '<img src=x onerror=alert(1)>',
    colour: '<a href="evil">colour</a>',
    locale: 'en',
  });
  assert.ok(input);
  const message = reservationNotification(input);
  assert.match(message.html, /&lt;img/);
  assert.match(message.html, /&lt;a href=&quot;evil&quot;&gt;/);
  assert.doesNotMatch(message.html, /<img|<a href=/);
  assert.equal(message.subject, 'ALSVID FC1 reservation enquiry');
  assert.match(message.text, /No payment or order was created/);
});
