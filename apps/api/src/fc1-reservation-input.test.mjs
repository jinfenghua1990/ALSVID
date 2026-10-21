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

test('requires a valid city and country for a test-ride interest request', () => {
  const base = {
    purpose: 'test_ride',
    email: 'rider@example.de',
    model: 'FC1 Standard',
    colour: 'Sample Green',
    locale: 'de',
    country: 'DE',
  };
  for (const value of [
    { ...base },
    { ...base, city: '' },
    { ...base, city: 'B' },
    { ...base, city: 'Berlin\nBcc:someone@example.com' },
    { ...base, city: 'x'.repeat(81) },
    { ...base, city: 'Berlin', country: 'XX' },
    { ...base, city: 'Berlin', name: 15 },
    { ...base, city: 'Berlin', name: '<'.repeat(81) },
    { ...base, city: 'Berlin', name: 'User\rAdmin' },
    { ...base, city: 'Berlin', purpose: 'unknown' },
  ]) {
    assert.equal(normalizeReservationEnquiry(value), null);
  }
  const accepted = normalizeReservationEnquiry({
    ...base,
    city: '  München ',
    name: '  Rider  ',
  });
  assert.ok(accepted);
  assert.equal(accepted.purpose, 'test_ride');
  assert.equal(accepted.city, 'München');
  assert.equal(accepted.name, 'Rider');
  assert.equal(accepted.country, 'DE');
});

test('test-ride notification is distinct, escapes user data and never confirms a booking', () => {
  const value = normalizeReservationEnquiry({
    purpose: 'test_ride',
    email: 'rider@example.de',
    model: '<img src=x onerror=alert(1)>',
    colour: '<b>Blue</b>',
    country: 'AT',
    city: '<Vienna>',
    name: '<script>alert(1)</script>',
    locale: 'en',
  });
  assert.ok(value);
  const message = reservationNotification(value);
  assert.match(message.subject, /test ride enquiry/);
  assert.match(message.html, /&lt;Vienna&gt;/);
  assert.match(message.html, /&lt;script&gt;/);
  assert.doesNotMatch(message.html, /<script|<img|<b>/);
  assert.match(message.text, /not a confirmed booking/);
  assert.match(message.text, /No test ride appointment, payment or order was created/);
});

test('existing email-only reservation format remains supported', () => {
  const value = normalizeReservationEnquiry({ email: 'member@example.com' });
  assert.ok(value);
  assert.equal(value.purpose, 'reservation');
  assert.equal(value.city, '');
  assert.equal(value.country, null);
  assert.equal(reservationNotification(value).subject, 'ALSVID FC1 reservation enquiry');
});
