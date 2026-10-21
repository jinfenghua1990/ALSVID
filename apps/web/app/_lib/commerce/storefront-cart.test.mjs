import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import test from "node:test";
import ts from "typescript";

const dir=dirname(fileURLToPath(import.meta.url));
const source=await readFile(join(dir,"storefront-cart.ts"),"utf8");
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const example={product:"FC1",model:"standard",colour:"sample",quantity:1};

function createCart({blocked=false,oldPreview=false}={}){
 const data=new Map(),session=new Map(),events=[];
 if(oldPreview)session.set("alsvid_fc1_preview_cart_v1",JSON.stringify({version:1,...example}));
 const storage=(map)=>({
   getItem:key=>map.get(key)??null,
   setItem:(key,value)=>{if(blocked)throw Error("storage disabled");map.set(key,value);},
   removeItem:key=>{if(blocked)throw Error("storage disabled");map.delete(key);}
 });
 const window={localStorage:storage(data),sessionStorage:storage(session),dispatchEvent:event=>events.push(event.type)};
 const module={exports:{}};
 class Event{constructor(type){this.type=type;}}
 runInNewContext(outputText,{window,Event,exports:module.exports,module});
 return {...module.exports,data,session,events};
}
const json=value=>JSON.parse(JSON.stringify(value));
test("unpriced configuration can be safely added, incremented and removed without payment",()=>{
 const c=createCart();
 assert.equal(c.readStorefrontCart().items.length,0);
 assert.equal(c.addCartLine(example),true);
 assert.equal(c.addCartLine(example),true);
 assert.equal(c.addCartLine({...example,colour:"black"}),true);
 assert.equal(c.cartQuantity(c.readStorefrontCart()),3);
 assert.equal(c.readStorefrontCart().items.length,2);
 assert.equal(c.setCartLineQuantity(c.lineKey(example),5),true);
 assert.equal(c.cartQuantity(c.readStorefrontCart()),6);
 assert.equal(c.removeCartLine(c.lineKey(example)),true);
 assert.equal(c.cartQuantity(c.readStorefrontCart()),1);
 assert.equal(c.clearStorefrontCart(),true);
 assert.deepEqual(json(c.readStorefrontCart()),{version:1,items:[]});
 assert.ok(c.events.includes("alsvid-cart-change"));
});
test("cart rejects spoofed variants, quantities and corrupted browser storage",()=>{
 const c=createCart();
 for(const line of [{...example,product:"FC2"},{...example,model:"turbo"},{...example,colour:"red"},{...example,quantity:0},{...example,quantity:10},{...example,quantity:1.5}]){
  assert.equal(c.addCartLine(line),false);
 }
 assert.equal(c.addCartLine({...example,quantity:9}),true);
 assert.equal(c.addCartLine(example),false);
 assert.equal(c.setCartLineQuantity(c.lineKey(example),10),false);
 assert.equal(c.cartQuantity(c.readStorefrontCart()),9);
 c.data.set(c.CART_STORAGE_KEY,"{not json");
 assert.deepEqual(json(c.readStorefrontCart()),{version:1,items:[]});
});
test("legacy one-tab FC1 preview migrates to persistent first-party selection",()=>{
 const c=createCart({oldPreview:true});
 assert.deepEqual(json(c.readStorefrontCart()),{version:1,items:[example]});
 assert.ok(c.data.has(c.CART_STORAGE_KEY));
 assert.equal(c.session.size,0);
});
test("restricted storage fails closed without invented order or price",()=>{
 const c=createCart({blocked:true});
 assert.equal(c.addCartLine(example),false);
 assert.equal(c.readStorefrontCart().items.length,0);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|paymentIntent|createOrder/);
});
