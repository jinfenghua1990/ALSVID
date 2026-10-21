import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const appRoot = resolve('apps/web/app');
async function filesUnder(directory) {
  const found=[];
  for(const item of await readdir(directory,{withFileTypes:true})) {
    const path=join(directory,item.name);
    if(item.isDirectory())found.push(...await filesUnder(path));
    else if(/\.(tsx|json)$/.test(item.name))found.push(path);
  }
  return found;
}

test('WWW and portal UI avoid decorative diagonal glyphs',async()=>{
  const offenders=[];
  for(const file of await filesUnder(appRoot)){
    const source=await readFile(file,'utf8');
    if(/[↗↘]/u.test(source))offenders.push(file.replace(appRoot+'/',''));
  }
  assert.deepEqual(offenders,[],'Remove decorative diagonal CTA arrows, not functional text labels');
});

test('home, catalog, dealer and FC1/FC2 share one multilingual header',async()=>{
 const files=[
  '_components/home/home-page.tsx',
  '_components/catalog/catalog-shell.tsx',
  '_components/public-network/public-shell.tsx',
  '_components/product/fc1-story-v4.tsx',
  '_components/product/fc1-product.tsx',
  '_components/product/fc2-product.tsx',
  '[locale]/explore/[slug]/page.tsx',
 ];
 for(const file of files){
  const source=await readFile(join(appRoot,file),'utf8');
  assert.match(source,/<PublicSiteHeader\b/,file+' must use the shared public header');
 }
 const header=await readFile(join(appRoot,'_components/public-site-header.tsx'),'utf8');
 assert.match(header,/variant="globe"/);
 assert.match(header,/product\.model_fc1/);
 assert.match(header,/navigation\.global_dealers/);
});

test('zh/de/en public navigation and application copy cover the same controls',async()=>{
 const prefix=join(appRoot,'_lib/i18n');
 for(const locale of ['zh','de','en']){
  const network=JSON.parse(await readFile(join(prefix,'public-network',locale+'.json'),'utf8'));
  assert.ok(network['network.nav.apply']);
  assert.ok(network['network.nav.account']);
  assert.ok(network['network.hero.apply']);
 }
});
