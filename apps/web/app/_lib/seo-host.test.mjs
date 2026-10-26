import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { canonicalWwwHost, effectiveHostname, isPublicWebsiteHostname, shouldRedirectToCanonicalWww } from './seo-host.ts';

function headers(values) {
  return { get: (name) => values[name] ?? null };
}

test('WWW host is resolved consistently behind reverse proxies', () => {
  assert.equal(effectiveHostname(headers({host: 'internal.run.app', 'x-forwarded-host': 'WWW.ALSVIDBIKE.COM, edge.local'})), canonicalWwwHost);
  assert.equal(effectiveHostname(headers({host: 'alsvidbike.com:443'})), 'alsvidbike.com');
  assert.equal(effectiveHostname(headers({host: 'localhost:3000'})), 'localhost');
  assert.equal(effectiveHostname(headers({}), 'www.alsvidbike.com'), canonicalWwwHost);
});

test('only the apex redirects to WWW; private portals stay private', () => {
  assert.equal(shouldRedirectToCanonicalWww('alsvidbike.com'), true);
  for (const host of ['www.alsvidbike.com', 'admin.alsvidbike.com', 'my.alsvidbike.com', 'dealer.alsvidbike.com', 'localhost']) {
    assert.equal(shouldRedirectToCanonicalWww(host), false, host);
  }
  for (const host of ['www.alsvidbike.com', 'alsvidbike.com', 'localhost', '127.0.0.1']) {
    assert.equal(isPublicWebsiteHostname(host), true, host);
  }
  for (const host of ['admin.alsvidbike.com', 'dealer.alsvidbike.com', 'my.alsvidbike.com', 'internal.run.app']) {
    assert.equal(isPublicWebsiteHostname(host), false, host);
  }
});

test('robots and proxy apply the same hostname policy', () => {
  const robots = readFileSync(new URL('../robots.ts', import.meta.url), 'utf8');
  const proxy = readFileSync(new URL('../../proxy.ts', import.meta.url), 'utf8');
  assert.match(robots, /effectiveHostname\(await headers\(\)\)/);
  assert.match(robots, /isPublicWebsiteHostname\(hostname\)/);
  assert.match(proxy, /shouldRedirectToCanonicalWww\(host\)/);
  assert.match(proxy, /NextResponse\.redirect\(canonical, 308\)/);
});
