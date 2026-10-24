import assert from 'node:assert/strict';
import test from 'node:test';
import { countryFromRequest, requestLocale } from './request-locale.ts';

test('bundled IP database maps real addresses without browser-language negotiation', () => {
  for (const [ip, country, locale] of [
    ['194.25.2.129', 'DE', 'de'],
    ['193.170.1.1', 'AT', 'de'],
    ['114.114.114.114', 'CN', 'zh'],
    ['8.8.8.8', 'US', 'en'],
    ['2001:4860:4860::8888', 'US', 'en'],
    ['::ffff:194.25.2.129', 'DE', 'de'],
  ]) {
    const headers = new Headers({ 'x-forwarded-for': ip + ', 10.0.0.1', 'accept-language': 'zh-CN' });
    assert.equal(countryFromRequest(headers), country, ip);
    assert.equal(requestLocale(undefined, headers), locale, ip);
    assert.equal(requestLocale('en', headers), 'en', 'Explicit choice overrides IP');
  }
});
test('missing, malformed and private IPs use German; country headers are not trusted', () => {
  for (const ip of ['', 'invalid', '127.0.0.1', '10.0.0.1', '::1']) {
    const headers = new Headers({ 'x-forwarded-for': ip, 'cf-ipcountry': 'CN', 'accept-language': 'zh' });
    assert.equal(countryFromRequest(headers), null, ip);
    assert.equal(requestLocale(undefined, headers), 'de', ip);
  }
});
