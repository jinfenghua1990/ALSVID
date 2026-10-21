/**
 * First-party WWW cart preview. These lines are only saved selections, not
 * priced SKUs, inventory reservations, orders or payment instructions.
 * The approved PSP/order gate must be completed before enabling paid checkout.
 */
export type CartModel = "standard" | "pro";
export type CartColour = "sample" | "black" | "blue" | "silver";
export type CartLine = { product: "FC1"; model: CartModel; colour: CartColour; quantity: number };
export type StorefrontCart = { version: 1; items: CartLine[] };
export const CART_STORAGE_KEY = "alsvid_storefront_cart_preview_v1";
export const CART_CHANGE_EVENT = "alsvid-cart-change";
export const EMPTY_CART: StorefrontCart = { version: 1, items: [] };
const MAX_LINES=18;
const validModel=(x:unknown):x is CartModel=>x==="standard"||x==="pro";
const validColour=(x:unknown):x is CartColour=>x==="sample"||x==="black"||x==="blue"||x==="silver";
const validQuantity=(x:unknown):x is number=>typeof x==="number"&&Number.isInteger(x)&&x>=1&&x<=9;
export const lineKey=(x:CartLine)=>x.product+":"+x.model+":"+x.colour;
const plain=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==="object"&&!Array.isArray(x);
export function normalizeCart(value:unknown):StorefrontCart|null {
 if(!plain(value)||value.version!==1||!Array.isArray(value.items)||value.items.length>MAX_LINES)return null;
 const keys=new Set<string>();
 const items:CartLine[]=[];
 for(const candidate of value.items){
  if(!plain(candidate)||candidate.product!=="FC1"||!validModel(candidate.model)||!validColour(candidate.colour)||!validQuantity(candidate.quantity))return null;
  const line:CartLine={product:"FC1",model:candidate.model,colour:candidate.colour,quantity:candidate.quantity};
  const key=lineKey(line);if(keys.has(key))return null;
  keys.add(key);items.push(line);
 }
 return {version:1,items};
}
function readStorage():StorefrontCart {
 if(typeof window==="undefined")return EMPTY_CART;
 try{
  const raw=window.localStorage.getItem(CART_STORAGE_KEY);
  if(raw)return normalizeCart(JSON.parse(raw))??EMPTY_CART;
  // One-time migration from the old, single-tab FC1 preview, without writing customer data.
  const previous=window.sessionStorage.getItem("alsvid_fc1_preview_cart_v1");
  if(previous){
   const parsed=JSON.parse(previous);
   if(plain(parsed)&&parsed.version===1&&parsed.product==="FC1"&&validModel(parsed.model)&&validColour(parsed.colour)&&validQuantity(parsed.quantity)){
    const migrated:StorefrontCart={version:1,items:[{product:"FC1",model:parsed.model,colour:parsed.colour,quantity:parsed.quantity}]};
    window.localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(migrated));
    window.sessionStorage.removeItem("alsvid_fc1_preview_cart_v1");
    return migrated;
   }
  }
 }catch{/* Privacy mode, blocked storage or invalid data: fail closed. */}
 return EMPTY_CART;
}
export const readStorefrontCart=():StorefrontCart=>readStorage();
export const cartQuantity=(cart:StorefrontCart)=>cart.items.reduce((sum,line)=>sum+line.quantity,0);
function saveCart(cart:StorefrontCart):boolean {
 if(typeof window==="undefined")return false;
 const normalized=normalizeCart(cart);if(!normalized)return false;
 try{
  window.localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(normalized));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  return true;
 }catch{return false;}
}
export function addCartLine(candidate:CartLine):boolean {
 const line=normalizeCart({version:1,items:[candidate]})?.items[0];if(!line)return false;
 const items=[...readStorage().items], index=items.findIndex(item=>lineKey(item)===lineKey(line));
 if(index>=0){const old=items[index]!;const qty=old.quantity+line.quantity;if(qty>9)return false;items[index]={...old,quantity:qty};}
 else if(items.length<MAX_LINES)items.push(line);
 else return false;
 return saveCart({version:1,items});
}
export function setCartLineQuantity(key:string,quantity:number):boolean {
 if(!validQuantity(quantity))return false;
 const items=readStorage().items.map(item=>lineKey(item)===key?{...item,quantity}:item);
 if(!items.some(item=>lineKey(item)===key))return false;
 return saveCart({version:1,items});
}
export function removeCartLine(key:string):boolean {
 const existing=readStorage().items;
 if(!existing.some(item=>lineKey(item)===key))return false;
 return saveCart({version:1,items:existing.filter(item=>lineKey(item)!==key)});
}
export function clearStorefrontCart():boolean {return saveCart(EMPTY_CART);}
