/**
 * First-party WWW selection cart. FC2 and accessory entries are previews,
 * NOT verified purchasable SKUs or compatibility claims. Never collect payment,
 * accept orders, reserve inventory or calculate unverified prices here.
 * Keep version/key stable to preserve existing FC1 selections.
 */
export type CartModel = "standard" | "pro";
export type CartColour = "sample" | "black" | "blue" | "silver";
export type AccessoryCategory = "basket" | "rack" | "mudguard" | "light" | "parts";
export type CartLine =
  | { product: "FC1"; model: CartModel; colour: CartColour; quantity: number }
  | { product: "FC2"; quantity: number }
  | { product: "ACCESSORY"; category: AccessoryCategory; quantity: number };
export type StorefrontCart = { version: 1; items: CartLine[] };
export const CART_STORAGE_KEY = "alsvid_storefront_cart_preview_v1";
export const CART_CHANGE_EVENT = "alsvid-cart-change";
export const EMPTY_CART: StorefrontCart = { version: 1, items: [] };
const MAX_LINES = 18;
const validModel = (x: unknown): x is CartModel => x === "standard" || x === "pro";
const validColour = (x: unknown): x is CartColour => x === "sample" || x === "black" || x === "blue" || x === "silver";
const validAccessory = (x: unknown): x is AccessoryCategory =>
 x === "basket" || x === "rack" || x === "mudguard" || x === "light" || x === "parts";
const validQuantity = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= 9;
const plain = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
export const lineKey = (x: CartLine): string =>
 x.product === "FC1" ? "FC1:" + x.model + ":" + x.colour :
 x.product === "FC2" ? "FC2" : "ACCESSORY:" + x.category;

function normalLine(candidate: unknown): CartLine | null {
 if (!plain(candidate) || !validQuantity(candidate.quantity)) return null;
 if (candidate.product === "FC1" && validModel(candidate.model) && validColour(candidate.colour))
  return { product: "FC1", model: candidate.model, colour: candidate.colour, quantity: candidate.quantity };
 if (candidate.product === "FC2" && Object.keys(candidate).every(key => key === "product" || key === "quantity"))
  return { product: "FC2", quantity: candidate.quantity };
 if (candidate.product === "ACCESSORY" && validAccessory(candidate.category) &&
   Object.keys(candidate).every(key => key === "product" || key === "category" || key === "quantity"))
  return { product: "ACCESSORY", category: candidate.category, quantity: candidate.quantity };
 return null;
}

export function normalizeCart(value: unknown): StorefrontCart | null {
 if (!plain(value) || value.version !== 1 || !Array.isArray(value.items) || value.items.length > MAX_LINES) return null;
 const keys = new Set<string>();
 const items: CartLine[] = [];
 for (const candidate of value.items) {
  const line = normalLine(candidate);
  if (!line) return null;
  const key = lineKey(line);
  if (keys.has(key)) return null;
  keys.add(key); items.push(line);
 }
 return { version: 1, items };
}

function readStorage(): StorefrontCart {
 if (typeof window === "undefined") return EMPTY_CART;
 try {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (raw) return normalizeCart(JSON.parse(raw)) ?? EMPTY_CART;
  // One-time migration from old single-tab FC1 preview.
  const previous = window.sessionStorage.getItem("alsvid_fc1_preview_cart_v1");
  if (previous) {
   const parsed = JSON.parse(previous);
   if (plain(parsed) && parsed.version === 1 && parsed.product === "FC1" &&
       validModel(parsed.model) && validColour(parsed.colour) && validQuantity(parsed.quantity)) {
    const migrated: StorefrontCart = { version: 1, items: [{
     product: "FC1", model: parsed.model, colour: parsed.colour, quantity: parsed.quantity
    }] };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(migrated));
    window.sessionStorage.removeItem("alsvid_fc1_preview_cart_v1");
    return migrated;
   }
  }
 } catch { /* Private browsing, blocked or corrupt storage: fail closed. */ }
 return EMPTY_CART;
}
export const readStorefrontCart = (): StorefrontCart => readStorage();
export const cartQuantity = (cart: StorefrontCart) => cart.items.reduce((sum, line) => sum + line.quantity, 0);

function saveCart(cart: StorefrontCart): boolean {
 if (typeof window === "undefined") return false;
 const normalized = normalizeCart(cart);
 if (!normalized) return false;
 try {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  return true;
 } catch { return false; }
}

export function addCartLine(candidate: CartLine): boolean {
 const line = normalLine(candidate);
 if (!line) return false;
 const items = [...readStorage().items], index = items.findIndex(item => lineKey(item) === lineKey(line));
 if (index >= 0) {
  const old = items[index]!;
  const quantity = old.quantity + line.quantity;
  if (quantity > 9) return false;
  items[index] = { ...old, quantity };
 } else if (items.length < MAX_LINES) items.push(line);
 else return false;
 return saveCart({ version: 1, items });
}

export function setCartLineQuantity(key: string, quantity: number): boolean {
 if (!validQuantity(quantity)) return false;
 const current = readStorage().items;
 if (!current.some(item => lineKey(item) === key)) return false;
 return saveCart({ version: 1, items: current.map(item => lineKey(item) === key ? { ...item, quantity } : item) });
}
export function removeCartLine(key: string): boolean {
 const current = readStorage().items;
 if (!current.some(item => lineKey(item) === key)) return false;
 return saveCart({ version: 1, items: current.filter(item => lineKey(item) !== key) });
}
export function clearStorefrontCart(): boolean { return saveCart(EMPTY_CART); }
