import type { DatabasePort } from '@alsvid/database';
import { ForbiddenError } from '@alsvid/kernel';

export type StorefrontMarket = 'DE' | 'AT';
export type StorefrontReadinessBlocker =
  | 'MODEL_NOT_PUBLISHED'
  | 'MODEL_NOT_ACTIVE'
  | 'VARIANT_NOT_ACTIVE'
  | 'SKU_NOT_ACTIVE'
  | 'MARKET_SCOPE_UNVERIFIED'
  | 'NO_ACTIVE_PRICE'
  | 'NO_MARKET_STOCK_POSITION'
  | 'NO_LEDGER_AVAILABILITY'
  | 'CHANNEL_ALLOCATION_UNVERIFIED'
  | 'TAX_SHIPPING_UNVERIFIED'
  | 'PSP_NOT_CONFIGURED';

export type StorefrontReadinessRow = {
  skuId: string; sku: string; skuName: string; modelCode: string;
  variantCode: string; colorCode: string | null; marketCode: string | null;
  publicationStatus: string; priceGross: string | null; currency: 'EUR';
  taxRateBasisPoints: number | null; locationCount: number;
  onHand: string | null; reserved: string | null; ledgerAvailable: string | null;
  /** No channel allocation/PSP contract exists: these are read-only diagnostics. */
  checkoutEnabled: false; inventoryReservable: false;
  blockers: StorefrontReadinessBlocker[];
};
export type StorefrontReadinessSnapshot = {
  market: StorefrontMarket; checkedAt: string; checkoutEnabled: false;
  truncated: boolean; rows: StorefrontReadinessRow[];
};
type ReadinessFact = {
  sku_id: string; sku: string; sku_name: string; model_code: string;
  variant_code: string; color_code: string | null; market_code: string | null;
  model_status: string; variant_status: string; sku_status: string;
  publication_status: string | null; unit_price_gross: string | null;
  tax_rate_basis_points: number | null; location_count: number | string;
  on_hand: string | null; reserved: string | null; available: string | null;
};

const MAX_ROWS = 500;
const validAmount = (v: string | null): boolean =>
  v !== null && /^(?:0|[1-9]\d{0,15})(?:\.\d{1,6})?$/.test(v) &&
  Number.isFinite(Number(v));

/** Deterministic, fail-closed diagnostics. Never grants permission to sell. */
export function evaluateStorefrontReadiness(fact: ReadinessFact): StorefrontReadinessRow {
  const blockers: StorefrontReadinessBlocker[] = [];
  if (fact.publication_status !== 'PUBLISHED') blockers.push('MODEL_NOT_PUBLISHED');
  if (fact.model_status !== 'ACTIVE') blockers.push('MODEL_NOT_ACTIVE');
  if (fact.variant_status !== 'ACTIVE') blockers.push('VARIANT_NOT_ACTIVE');
  if (fact.sku_status !== 'ACTIVE') blockers.push('SKU_NOT_ACTIVE');
  // A missing/global/unknown market code is not evidence of DE or AT eligibility.
  if (fact.market_code !== 'DE' && fact.market_code !== 'AT' ||
      fact.market_code !== null && fact.market_code !== undefined && fact.market_code.length !== 2) {
    blockers.push('MARKET_SCOPE_UNVERIFIED');
  }
  if (!fact.unit_price_gross || !validAmount(fact.unit_price_gross) ||
      Number(fact.unit_price_gross) <= 0 ||
      !Number.isInteger(fact.tax_rate_basis_points) ||
      fact.tax_rate_basis_points! < 0 || fact.tax_rate_basis_points! > 10000)
    blockers.push('NO_ACTIVE_PRICE');
  const count = Number(fact.location_count);
  const known = Number.isSafeInteger(count) && count > 0 &&
    validAmount(fact.on_hand) && validAmount(fact.reserved) && validAmount(fact.available);
  if (!known) blockers.push('NO_MARKET_STOCK_POSITION');
  else if (Number(fact.available) <= 0) blockers.push('NO_LEDGER_AVAILABILITY');

  // Future eligibility requires an explicit channel/warehouse allocation,
  // authoritative tax/shipping calculation, and PSP verification. Never derive
  // these from positive Inventory ledger rows or a draft price.
  blockers.push('CHANNEL_ALLOCATION_UNVERIFIED', 'TAX_SHIPPING_UNVERIFIED', 'PSP_NOT_CONFIGURED');
  return {
    skuId: fact.sku_id, sku: fact.sku, skuName: fact.sku_name,
    modelCode: fact.model_code, variantCode: fact.variant_code,
    colorCode: fact.color_code, marketCode: fact.market_code,
    publicationStatus: fact.publication_status ?? 'MISSING',
    priceGross: fact.unit_price_gross, currency: 'EUR',
    taxRateBasisPoints: fact.tax_rate_basis_points,
    locationCount: known ? count : 0,
    onHand: known ? fact.on_hand : null,
    reserved: known ? fact.reserved : null,
    ledgerAvailable: known ? fact.available : null,
    checkoutEnabled: false, inventoryReservable: false, blockers,
  };
}

/**
 * One read-only view of the Product SKU, publication approval, active market
 * price, and Inventory ledger. No copy of balances, no mutations, no public
 * order/payment API. Read permission to BOTH Commerce and Inventory required.
 */
export class StorefrontReadinessService {
  constructor(private readonly db: DatabasePort) {}
  async summary(actor: { permissions: readonly string[] }, market: unknown): Promise<StorefrontReadinessSnapshot> {
    if (!actor.permissions.includes('commerce.storefront.read') ||
        !actor.permissions.includes('inventory.read'))
      throw new ForbiddenError('COMMERCE_FORBIDDEN', 'Commerce and inventory read permissions required');
    if (market !== 'DE' && market !== 'AT') throw new Error('INVALID_STOREFRONT_MARKET');
    const result = await this.db.query<ReadinessFact>(`
      SELECT s.id AS sku_id, s.sku, s.name AS sku_name,
        m.code AS model_code, v.code AS variant_code,
        s.color_code, s.market_code,
        m.status AS model_status, v.status AS variant_status, s.status AS sku_status,
        cp.status AS publication_status,
        p.unit_price_gross::text AS unit_price_gross, p.tax_rate_basis_points,
        COALESCE(stock.location_count, 0) AS location_count,
        stock.on_hand::text AS on_hand, stock.reserved::text AS reserved,
        stock.available::text AS available
      FROM product.skus s
      JOIN product.variants v ON v.id = s.variant_id
      JOIN product.models m ON m.id = v.model_id
      LEFT JOIN product.catalog_publications cp ON cp.model_id = m.id
      LEFT JOIN commerce.storefront_prices p
        ON p.sku_id = s.id AND p.market_country = $1 AND p.status = 'ACTIVE'
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS location_count,
          COALESCE(SUM(a.on_hand),0) AS on_hand,
          COALESCE(SUM(a.reserved),0) AS reserved,
          COALESCE(SUM(a.available),0) AS available
        FROM inventory.v_availability a
        JOIN warehouse.locations l ON l.id = a.location_id
        JOIN warehouse.warehouses w ON w.id = l.warehouse_id
        WHERE a.item_kind = 'SKU' AND a.sku_id = s.id
          AND l.active = true AND w.active = true AND w.country_code = $1
      ) stock ON true
      ORDER BY m.code, v.code, s.sku
      LIMIT ${MAX_ROWS + 1}`, [market]);
    return {
      market, checkedAt: new Date().toISOString(), checkoutEnabled: false,
      truncated: result.rows.length > MAX_ROWS,
      rows: result.rows.slice(0, MAX_ROWS).map(row => {
        const evaluated = evaluateStorefrontReadiness(row);
        if (row.market_code !== market && !evaluated.blockers.includes('MARKET_SCOPE_UNVERIFIED'))
          evaluated.blockers.unshift('MARKET_SCOPE_UNVERIFIED');
        return evaluated;
      }),
    };
  }
}
