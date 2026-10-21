/**
 * Read-only filtering of the currently loaded ALSVID first-party order snapshot.
 * Must not infer payment, delivery or customer entitlement from these fields.
 */
export type StorefrontOrderLookup = {
  orderNumber: string;
  customerEmail: string;
  status: string;
  marketCountry: string;
  lines: ReadonlyArray<{ skuCode: string; skuName: string }>;
};

export type StorefrontOrderFilters = {
  query: string;
  status: string;
  market: string;
};

export function filterStorefrontOrders<T extends StorefrontOrderLookup>(
  orders: readonly T[],
  filters: StorefrontOrderFilters,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return orders.filter(order => {
    if (filters.status !== 'ALL' && order.status !== filters.status) return false;
    if (filters.market !== 'ALL' && order.marketCountry !== filters.market) return false;
    if (!query) return true;
    return [order.orderNumber, order.customerEmail,
      ...order.lines.flatMap(line => [line.skuCode, line.skuName]),
    ].some(value => value.toLocaleLowerCase().includes(query));
  });
}
