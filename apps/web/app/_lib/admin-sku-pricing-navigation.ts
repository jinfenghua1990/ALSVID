/**
 * Admin navigation from a Product SKU to its first-party Commerce price editor.
 * Selection is client-side convenience only; all Commerce writes still authorize
 * and validate the referenced SKU/price on the server.
 */
export type PricingTargetSku = { id: string; market_code?: string | null };
export type PricingTargetMarket = 'DE' | 'AT';
export type PricingTargetStatus = 'default' | 'selected' | 'missing';

export function adminSkuPricingHref(sku: PricingTargetSku): string {
  const query = new URLSearchParams({ skuId: sku.id });
  if (sku.market_code === 'DE' || sku.market_code === 'AT') {
    query.set('market', sku.market_code);
  }
  return '/admin/orders?' + query.toString() + '#b2c';
}

export function resolveAdminPricingTarget<T extends { id: string }>(
  skus: readonly T[],
  search: string,
): { skuId: string; market: PricingTargetMarket; status: PricingTargetStatus } {
  const query = new URLSearchParams(search);
  const requestedSkuId = query.get('skuId');
  const requestedMarket = query.get('market');
  const market: PricingTargetMarket = requestedMarket === 'AT' ? 'AT' : 'DE';
  if (requestedSkuId === null) {
    return { skuId: skus[0]?.id ?? '', market: 'DE', status: 'default' };
  }
  // A nonempty query id must belong to the currently authorized API snapshot.
  // Never fall back to an unrelated SKU if a deep link is missing or invalid.
  const match = skus.find(sku => sku.id === requestedSkuId && requestedSkuId.length > 0);
  if (!match) return { skuId: '', market, status: 'missing' };
  return { skuId: match.id, market, status: 'selected' };
}
