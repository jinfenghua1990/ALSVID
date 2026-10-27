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
 assert.match(header,/common\.back_home/,'shared public header exposes an explicit home link on subpages');
 assert.match(header,/styles\.homeLink/,'desktop home link has a dedicated style');
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

test('homepage first KV restores the archived owner-selected poster and journey headline',async()=>{
 const home=await readFile(join(appRoot,'_components/home/home-page.tsx'),'utf8');
 assert.ok(home.includes('image: "/home/fc1-poster-clean.png", alt: t("hero.poster_alt")'),
   'First KV must use the archived clean poster with the original person-and-bike composition');
 assert.ok(!home.includes('image: "/home/fc1-city-kv.webp", bikeImage:'),
   'First KV must not use the later empty city backdrop with a second cutout bike');
 const titleByLocale={zh:'接下来去哪里？',de:'Wohin geht es als Nächstes?',en:'Where to next?'};
 for(const [locale,title] of Object.entries(titleByLocale)){
   const catalog=JSON.parse(await readFile(join(appRoot,'_lib/i18n/fc1',locale+'.json'),'utf8'));
   assert.equal(catalog['hero.poster_title'],title,locale+' first slide journey headline');
 }
});

test('homepage KV uses responsive optimized image delivery',async()=>{
 const hero=await readFile(join(appRoot,'_components/home/home-interactions.tsx'),'utf8');
 assert.match(hero,/import Image(?:, \{ getImageProps \})? from "next\/image"/);
 assert.match(hero,/<Image[^>]+fill[^>]+sizes="100vw"[^>]+preload=\{active === 0\}/,
   'Hero image should use responsive dimensions and preload only the initial slide');
 assert.doesNotMatch(hero,/<img key=\{slide\.image\}/,'Hero carousel must not send the original PNG at intrinsic size');
});

test('the WWW has one products navigation item and an integrated accessories catalog',async()=>{
 const home=await readFile(join(appRoot,'_components/public-site-header.tsx'),'utf8');
 assert.doesNotMatch(home,/href: prefix \+ '\/accessories'/,'No separate accessories global nav');
 const bikes=await readFile(join(appRoot,'[locale]/bikes/page.tsx'),'utf8');
 assert.match(bikes,/AccessoriesCatalogSection/,'Bikes and accessories share a product center');
 const legacy=await readFile(join(appRoot,'[locale]/accessories/page.tsx'),'utf8');
 assert.match(legacy,/redirect\(destination\)/,'Legacy accessories links remain compatible');
});


test('homepage KV follows the approved left-copy layout and exposes an in-page model discovery action',async()=>{
 const hero=await readFile(join(appRoot,'_components/home/home-interactions.tsx'),'utf8');
 const css=await readFile(join(appRoot,'_components/home/original-home.module.css'),'utf8');
 assert.match(css,/\.posterStage\s*\{[^}]*height:\s*100vh;\s*height:\s*100svh;/s,
   'desktop and mobile hero stage should fill the viewport');
 assert.match(css,/\.posterContent\s*\{[^}]*left:\s*clamp\(32px,\s*6vw,\s*160px\);[^}]*text-align:\s*left;/s,
   'desktop hero copy should stay in the left safe area');
 assert.match(hero,/href="#featured"/,'secondary hero CTA should lead to the featured model section');
 assert.match(hero,/discoverLabel/,'the localized model discovery CTA must be rendered');
});
