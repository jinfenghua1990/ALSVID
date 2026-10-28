import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSafeAdminRoute } from './workspace-cache-policy.ts';

test('admin tabs only use soft navigation for own safe routes',()=>{
  assert.equal(isSafeAdminRoute('/admin'),true);
  assert.equal(isSafeAdminRoute('/admin/product?nav=x'),true);
  for(const path of ['/login','/administrator','/api/control','//malicious.test/admin',
    'https://malicious.test/admin','javascript:alert(1)','/admin\\escape']){
    assert.equal(isSafeAdminRoute(path),false,path);
  }
});
test('Next Cache Components owns route Activity, not a homemade ReactNode cache',()=>{
  const cfg=readFileSync(new URL('../../../next.config.ts',import.meta.url),'utf8');
  const client=readFileSync(new URL('./admin-workspace-keeper.tsx',import.meta.url),'utf8');
  const tabs=readFileSync(new URL('../../../../../packages/ui/src/index.tsx',import.meta.url),'utf8');
  assert.match(cfg,/cacheComponents:\s*true/);
  assert.match(client,/router\.push\(href\)/);
  assert.doesNotMatch(client,/ReactNode\[\]|cachedRouteOrder|new Map\(.*children/);
  assert.match(tabs,/workspace\.navigate\(tab.path\)/);
});
