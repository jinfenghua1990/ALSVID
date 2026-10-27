/**
 * Read-only roll-up for the e-commerce workspace overview.
 *
 * Every number is derived from data the authorized summary API already returned.
 * Nothing here infers sellability, revenue or payment: a positive inventory or an
 * ACTIVE price does not make a product orderable on the website.
 */
export type EcommerceOverviewPrice = {
  skuId: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED' | string;
};

export type EcommerceOverviewInput = {
  skus: readonly { id: string }[];
  prices: readonly EcommerceOverviewPrice[];
  /** Whole-book status distribution from the API (never limited by a page). */
  orderStatusCounts: Readonly<Record<string, number>>;
  orderTotal: number;
};

export type EcommerceOverviewMetric = {
  key: string;
  label: string;
  value: number;
  hint: string;
  tone: 'neutral' | 'attention' | 'blocked';
};

/** The summary API pages SKUs; above this the derived SKU counts are partial. */
export const ECOMMERCE_SKU_SNAPSHOT_LIMIT = 500;

const count = (input: EcommerceOverviewInput, status: string): number =>
  Number(input.orderStatusCounts[status] ?? 0);

export function computeEcommerceOverview(input: EcommerceOverviewInput): EcommerceOverviewMetric[] {
  const activePricedSkuIds = new Set(
    input.prices.filter(price => price.status === 'ACTIVE').map(price => price.skuId),
  );
  const unpricedSkus = input.skus.filter(sku => !activePricedSkuIds.has(sku.id)).length;
  const pendingPriceDrafts = input.prices.filter(price => price.status === 'DRAFT').length;
  const partial = input.skus.length >= ECOMMERCE_SKU_SNAPSHOT_LIMIT;

  return [
    {
      key: 'orders-total',
      label: '第一方订单',
      value: Number(input.orderTotal ?? 0),
      hint: '全部状态的真实订单数，不受列表分页影响',
      tone: 'neutral',
    },
    {
      key: 'orders-draft',
      label: '内部草稿',
      value: count(input, 'DRAFT'),
      hint: '尚未提交，不收款、不进入生产',
      tone: 'neutral',
    },
    {
      key: 'orders-submitted',
      label: '已提交待支付',
      value: count(input, 'SUBMITTED'),
      hint: '支付通道未接入前会停在此状态',
      tone: count(input, 'SUBMITTED') > 0 ? 'attention' : 'neutral',
    },
    {
      key: 'orders-production',
      label: '生产中',
      value: count(input, 'IN_PRODUCTION'),
      hint: '已转生产单并进入生产环节',
      tone: 'neutral',
    },
    {
      key: 'orders-fulfillment',
      label: '待履约',
      value: count(input, 'FULFILLMENT_PENDING'),
      hint: '已核验付款，尚未全部转生产单',
      tone: count(input, 'FULFILLMENT_PENDING') > 0 ? 'attention' : 'neutral',
    },
    {
      key: 'skus-unpriced',
      label: '无启用售价 SKU',
      value: unpricedSkus,
      hint: partial
        ? 'SKU 快照已达接口上限，该数字为下限'
        : '没有 ACTIVE 价格版本的 SKU 无法建立订单草稿',
      tone: unpricedSkus > 0 ? 'blocked' : 'neutral',
    },
    {
      key: 'price-drafts',
      label: '待启用价格草稿',
      value: pendingPriceDrafts,
      hint: '草稿价格不参与下单计算，需人工启用',
      tone: pendingPriceDrafts > 0 ? 'attention' : 'neutral',
    },
  ];
}
