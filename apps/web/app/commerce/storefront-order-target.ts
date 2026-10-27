/**
 * Deep-link resolution for the ALSVID first-party (self-built storefront) order list.
 *
 * First-party orders live under /admin/ecommerce/orders. Their IDs are NOT the same
 * ID space as imported external-channel orders (/admin/orders), so a link must never
 * fall back to another order or to the external-order workspace when the requested
 * record is absent. Selection here is a read convenience only; the API still
 * authorizes and re-reads the order.
 */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StorefrontOrderTargetStatus = 'default' | 'selected' | 'missing' | 'search';

export type StorefrontOrderTarget = {
  /** Order id requested by the link, or null when the link used a search term. */
  orderId: string | null;
  /** Free-text term requested by the link, or empty. */
  query: string;
  status: StorefrontOrderTargetStatus;
};

export function storefrontOrderIdParam(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return uuid.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** Canonical in-app link to a first-party order. Never used for external-channel orders. */
export function storefrontOrderHref(order: { id: string; orderNumber: string }): string {
  const id = storefrontOrderIdParam(order.id);
  return id
    ? '/admin/ecommerce/orders?orderId=' + encodeURIComponent(id)
    : '/admin/ecommerce/orders?orderSearch=' + encodeURIComponent(order.orderNumber);
}

export function resolveStorefrontOrderTarget<T extends { id: string }>(
  orders: readonly T[],
  search: string,
): StorefrontOrderTarget {
  const params = new URLSearchParams(search);
  const requestedId = params.get('orderId');
  const requestedQuery = (params.get('orderSearch') ?? '').trim().slice(0, 100);

  if (requestedId !== null && requestedId.trim() !== '') {
    const id = storefrontOrderIdParam(requestedId);
    // A malformed or unknown id is reported as missing rather than silently
    // selecting a different order the operator did not ask for.
    if (!id || !orders.some(order => order.id.toLowerCase() === id)) {
      return { orderId: null, query: '', status: 'missing' };
    }
    return { orderId: id, query: '', status: 'selected' };
  }
  if (requestedQuery) return { orderId: null, query: requestedQuery, status: 'search' };
  return { orderId: null, query: '', status: 'default' };
}
