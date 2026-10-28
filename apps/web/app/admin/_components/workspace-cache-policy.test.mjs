import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {cachedRouteOrder,isSafeAdminRoute,MAX_LIVE_ADMIN_WORKSPACES} from './workspace-cache-policy.ts';

test('admin keep-alive keys have a bounded least-recently-active order',()=>{
 assert.equal(MAX_LIVE_ADMIN_WORKSPACES,4);
 const routes=['/admin','/admin/product','/admin/ecommerce','/admin/supply'];
 assert.deepEqual(cachedRouteOrder(routes,'/admin/analytics'),[
  '/admin/product','/admin/ecommerce','/admin/supply','/admin/analytics',
 ]);
 assert.deepEqual(cachedRouteOrder(routes,'/admin/product'),[
  '/admin','/admin/ecommerce','/admin/supply','/admin/product',
 ]);
 assert.deepEqual(cachedRouteOrder([], '/admin/product?nav=test'),['/admin/product?nav=test']);
});

test('reject cross-origin/protocol-relative/API and non-admin navigation from cache',()=>{
 for(const path of ['/admin','/admin/product','/admin/a?nav=x','#bad'].slice(0,3))
  assert.equal(isSafeAdminRoute(path),true);
 for(const path of ['https://attacker.invalid/admin','//attacker.invalid/admin','/login',
  '/api/control/v1/commerce','/administrator','/admin\\evil','javascript:alert(1)']){
  assert.equal(isSafeAdminRoute(path),false,path);
 }
 assert.throws(()=>cachedRouteOrder([], '/login'),/Only Admin/);
});

test('workspace state preservation uses React Activity and Next router rather than sessionStorage snapshots',()=>{
 const view=readFileSync(new URL('./admin-workspace-keeper.tsx',import.meta.url),'utf8');
 const tabs=readFileSync(new URL('../../../../../packages/ui/src/index.tsx',import.meta.url),'utf8');
 assert.match(view,/<Activity key=\{page.path\} mode=\{page.path===path\?'visible':'hidden'\}>/);
 assert.match(view,/router\.push\(href\)/);
 assert.match(view,/setCache\(/);
 assert.match(tabs,/workspace\.navigate\(tab.path\)/);
 assert.match(tabs,/workspace\?\.close\(path\)/);
});
