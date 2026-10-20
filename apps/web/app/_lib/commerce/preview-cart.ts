/**
 * Browser-only, non-transactional FC1 preview cart.
 * Nothing here creates a customer order, reserves stock or starts payment.
 * Keep it separate from future Commerce/Finance API contracts.
 */
export type Fc1PreviewModel = "standard" | "pro";
export type Fc1PreviewColour = "sample" | "black" | "blue" | "silver";

export interface Fc1PreviewCart {
  version: 1;
  product: "FC1";
  model: Fc1PreviewModel;
  colour: Fc1PreviewColour;
  quantity: number;
}

const STORAGE_KEY = "alsvid_fc1_preview_cart_v1";
const MODELS: readonly string[] = ["standard", "pro"];
const COLOURS: readonly string[] = ["sample", "black", "blue", "silver"];

export function normalizeFc1PreviewCart(value: unknown): Fc1PreviewCart | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const cart = value as Partial<Fc1PreviewCart>;
  if (cart.version !== 1 || cart.product !== "FC1") return null;
  if (!cart.model || !MODELS.includes(cart.model)) return null;
  if (!cart.colour || !COLOURS.includes(cart.colour)) return null;
  if (!Number.isInteger(cart.quantity) || (cart.quantity ?? 0) < 1 || (cart.quantity ?? 0) > 9) return null;
  return { version: 1, product: "FC1", model: cart.model, colour: cart.colour, quantity: cart.quantity! };
}

export function readFc1PreviewCart(): Fc1PreviewCart | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    return saved ? normalizeFc1PreviewCart(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function saveFc1PreviewCart(next: Fc1PreviewCart): boolean {
  const valid = normalizeFc1PreviewCart(next);
  if (!valid || typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}

export function clearFc1PreviewCart(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
