import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { sessionCookieNameForApiRequest, sessionCookieNameForHost, sessionCookieOptions } from './session-cookie.ts';

test('My owner API always uses dedicated customer session across temporary/local hosts',()=>{
 for(const host of ['localhost:3000','alsvid-web-51910044792.europe-west1.run.app','www.chaibenn.com','admin.alsvidbike.com','my.alsvidbike.com','admin.alsvid.com','my.alsvid.com']){
  assert.equal(sessionCookieNameForApiRequest(host,'/v1/my/garage'),'alsvid_my_session',host);
  assert.equal(sessionCookieNameForApiRequest(host,'/v1/my/service/cases'),'alsvid_my_session',host);
  assert.equal(sessionCookieNameForApiRequest(host,'/v1/my/garage?refresh=1'),'alsvid_my_session',host);
 }
});
test('My prefix must be a complete API path segment; do not select customer cookie for other APIs',()=>{
 assert.equal(sessionCookieNameForApiRequest('localhost:3000','/v1/procurement'),'alsvid_session');
 assert.equal(sessionCookieNameForApiRequest('localhost:3000','/v1/myfake/service'),'alsvid_session');
 assert.equal(sessionCookieNameForApiRequest('localhost:3000','/v1/my-client'),'alsvid_session');
 assert.equal(sessionCookieNameForApiRequest('localhost:3000','/v1/auth/me'),'alsvid_session');
 assert.equal(sessionCookieNameForApiRequest('my.alsvid.com','/v1/auth/me'),sessionCookieNameForHost('my.alsvid.com'));
});
test('server-side proxy chooses session from destination endpoint and ignores client-side portal text',()=>{
 const backend=readFileSync(new URL('../api/_lib/backend.ts',import.meta.url),'utf8');
 const proxy=readFileSync(new URL('../api/control/[...path]/route.ts',import.meta.url),'utf8');
 assert.match(backend,/sessionCookieNameForApiRequest\(requestHeaders\.get\('host'\) \?\? '', path\)/);
 assert.match(proxy,/backendFetch\(targetPath, init\)/);
});

test('internal portal session cookies use the canonical parent domain',()=>{
 const admin=sessionCookieOptions(new Request('https://admin.alsvidbike.com/',{headers:{host:'admin.alsvidbike.com'}}));
 assert.equal(admin.domain,'.alsvidbike.com');
 const owner=sessionCookieOptions(new Request('https://my.alsvidbike.com/',{headers:{host:'my.alsvidbike.com'}}));
 assert.equal(owner.domain,undefined);
});
