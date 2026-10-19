import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
const directory=path.dirname(fileURLToPath(import.meta.url));
const catalogs=Object.fromEntries(await Promise.all(["en","de","zh"].map(async locale=>[locale,JSON.parse(await readFile(path.join(directory,locale+".json"),"utf8"))])));
test("X5 translation coverage and interpolation agree in all public locales",()=>{
  const keys=Object.keys(catalogs.en).sort();
  for(const [locale,copy] of Object.entries(catalogs)){
    assert.deepEqual(Object.keys(copy).sort(),keys,locale+" keys");
    for(const key of keys){
      assert.equal(typeof copy[key],"string");
      assert.ok(copy[key].trim(),locale+":"+key);
      const placeholders=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
      assert.deepEqual(placeholders(copy[key]),placeholders(catalogs.en[key]),locale+":"+key+" placeholders");
    }
  }
});
test("X5 photography mismatch and commercial uncertainty remain explicit",()=>{
  for(const copy of Object.values(catalogs)){
    assert.match(copy["x5.photo.note"],/chain|Kette|链条/i);
    assert.match(copy["x5.faq.photo.a"],/Nexus/);
    assert.match(copy["x5.faq.photo.a"],/Michelin/);
    assert.match(copy["x5.spec.note"],/not confirmed|nicht bestätigt|尚未/i);
  }
});
test("All literal X5 product and gallery translation keys exist",async()=>{
  for(const file of ["x5-product.tsx","x5-gallery.tsx"]){
    const source=await readFile(path.join(directory,"../../../_components/product",file),"utf8");
    for(const match of source.matchAll(/["'](x5\.[a-z.]+)["']/g)){
      if(!match[1].endsWith(".")) assert.ok(catalogs.en[match[1]],file+" missing "+match[1]);
    }
  }
});
