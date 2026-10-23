import { adminRecordHref, recordId } from './record-links';

/** Search contracts mirror existing authorized domain read models; this module never writes. */
export type AdminSearchCatalog = {
  models: readonly { id: string; code: string; name: string }[];
  skus: readonly { id: string; sku: string; name: string }[];
};
export type AdminSearchOrder = {
  id?: string;
  orderNumber: string;
  customerEmail: string;
  lines: readonly { skuCode: string; skuName: string }[];
};
export type AdminSearchPartner = {
  id: string;
  partnerCode: string;
  displayName: string;
  countryCode?: string | null;
  roles?: readonly string[];
  status?: string | null;
};
export type AdminSearchProductionOrder = {
  id: string;
  production_order_number: string;
  sku: string;
  build_spec_code: string;
  factory_name: string;
  status: string;
};
export type AdminSearchVehicle = {
  id: string;
  vehicle_code?: string;
  frame_number: string;
  sku: string;
  production_order_number?: string;
  factory_name?: string;
};
export type AdminSearchInventoryBalance = {
  item_kind: string;
  part_number?: string | null;
  part_name?: string | null;
  sku?: string | null;
  sku_name?: string | null;
  frame_number?: string | null;
  warehouse_code?: string | null;
  warehouse_name?: string | null;
  location_code?: string | null;
  location_name?: string | null;
};
export type AdminSearchPurchaseOrder = {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_reference?: string | null;
  status: string;
  currency?: string;
};
export type AdminSearchQuotation = {
  id: string;
  quotation_number: string;
  supplier_name: string;
  supplier_reference?: string | null;
  status: string;
  currency?: string;
};
export type AdminSearchServiceCase = {
  id: string;
  caseNumber: string;
  vehicleId: string;
  frameNumber: string;
  sku: string;
  title: string;
  description?: string;
  category: string;
  status: string;
};
export type AdminSearchFinanceDocument = {
  id: string;
  document_number: string;
  partner_name?: string | null;
  document_type?: string;
  external_reference?: string | null;
  status: string;
};
export type AdminSearchFinanceObligation = {
  id: string;
  obligation_number: string;
  partner_name?: string | null;
  direction: string;
  settlement_status: string;
  currency?: string;
};
export type AdminSearchSources = {
  partners?: readonly AdminSearchPartner[] | null;
  production?: readonly AdminSearchProductionOrder[] | null;
  vehicles?: readonly AdminSearchVehicle[] | null;
  inventory?: readonly AdminSearchInventoryBalance[] | null;
  procurement?: {
    purchaseOrders?: readonly AdminSearchPurchaseOrder[];
    quotations?: readonly AdminSearchQuotation[];
  } | null;
  serviceCases?: readonly AdminSearchServiceCase[] | null;
  finance?: {
    documents?: readonly AdminSearchFinanceDocument[];
    obligations?: readonly AdminSearchFinanceObligation[];
  } | null;
};
export type AdminBusinessSearchResult = {
  type: 'model' | 'sku' | 'order' | 'partner' | 'production' | 'vehicle' | 'inventory'
    | 'purchase-order' | 'quotation' | 'service-case' | 'finance-document' | 'obligation';
  key: string;
  title: string;
  subtitle: string;
  href: string;
};

const contains = (query: string, ...fields: readonly (string | null | undefined)[]) =>
  fields.some(field => typeof field === 'string' && field.toLocaleLowerCase().includes(query));
const cap = <T>(rows: readonly T[]) => rows.slice(0, 8);
const join = (...fields: readonly (string | null | undefined)[]) => fields.filter(Boolean).join(' · ');

function partnerHref(partner: AdminSearchPartner): string {
  const roles = partner.roles ?? [];
  if (roles.includes('CUSTOMER')) return recordId(partner.id) ? adminRecordHref('customer', partner.id) : '/admin/customers';
  if (roles.includes('SUPPLIER')) return '/admin/supply';
  if (roles.includes('FACTORY')) return '/admin/production';
  return '/admin/dealers';
}

export function searchAuthorizedBusinessRecords(
  catalog: AdminSearchCatalog | null,
  orders: readonly AdminSearchOrder[] | null,
  query: string,
  sources: AdminSearchSources = {},
): AdminBusinessSearchResult[] {
  const term = query.trim().toLocaleLowerCase().slice(0, 100);
  if (term.length < 2) return [];
  const results: AdminBusinessSearchResult[] = [];

  if (catalog) {
    for (const model of cap(catalog.models.filter(item => contains(term, item.code, item.name)))) {
      results.push({ type: 'model', key: 'model:' + model.id, title: model.code, subtitle: model.name,
        href: '/admin/product?search=' + encodeURIComponent(model.code) + '#model-register' });
    }
    for (const sku of cap(catalog.skus.filter(item => contains(term, item.sku, item.name)))) {
      results.push({ type: 'sku', key: 'sku:' + sku.id, title: sku.sku, subtitle: sku.name,
        href: '/admin/product?search=' + encodeURIComponent(sku.sku) + '#model-register' });
    }
  }
  if (orders) {
    for (const order of cap(orders.filter(item => contains(term, item.orderNumber, item.customerEmail,
      ...(Array.isArray(item.lines) ? item.lines.flatMap(line => [line.skuCode, line.skuName]) : [])))) {
      results.push({ type: 'order', key: 'order:' + order.orderNumber, title: order.orderNumber,
        subtitle: 'ALSVID 自建商城订单 · ' + order.customerEmail,
        href: recordId(order.id) ? adminRecordHref('order', order.id!) :
          '/admin/orders?orderSearch=' + encodeURIComponent(order.orderNumber) + '#b2c' });
    }
  }

  if (sources.partners) {
    for (const partner of cap(sources.partners.filter(item => contains(term, item.partnerCode, item.displayName,
      item.countryCode, item.status, ...(item.roles ?? []))))) {
      results.push({ type: 'partner', key: 'partner:' + partner.id, title: partner.partnerCode,
        subtitle: join(partner.displayName, partner.countryCode, ...(partner.roles ?? [])),
        href: partnerHref(partner) });
    }
  }
  if (sources.production) {
    for (const order of cap(sources.production.filter(item => contains(term, item.production_order_number,
      item.sku, item.build_spec_code, item.factory_name, item.status)))) {
      results.push({ type: 'production', key: 'production:' + order.id, title: order.production_order_number,
        subtitle: join(order.sku, order.build_spec_code, order.factory_name, order.status),
        href: '/admin/production' });
    }
  }
  if (sources.vehicles) {
    for (const vehicle of cap(sources.vehicles.filter(item => contains(term, item.frame_number, item.vehicle_code,
      item.sku, item.production_order_number, item.factory_name)))) {
      results.push({ type: 'vehicle', key: 'vehicle:' + vehicle.id, title: vehicle.frame_number,
        subtitle: join(vehicle.sku, vehicle.production_order_number, vehicle.factory_name),
        href: recordId(vehicle.id) ? adminRecordHref('vehicle', vehicle.id) : '/admin/production' });
    }
  }
  if (sources.inventory) {
    for (const row of cap(sources.inventory.filter(item => contains(term, row.part_number, row.part_name, row.sku,
      row.sku_name, row.frame_number, row.warehouse_code, row.warehouse_name, row.location_code, row.location_name)))) {
      const itemCode = row.frame_number || row.sku || row.part_number || '库存记录';
      results.push({ type: 'inventory',
        key: ['inventory', row.item_kind, row.warehouse_code, row.location_code, itemCode].join(':'),
        title: itemCode, subtitle: join(row.part_name, row.sku_name, row.warehouse_code, row.warehouse_name,
          row.location_code, row.location_name, row.item_kind),
        href: '/admin/inventory' });
    }
  }
  if (sources.procurement) {
    for (const order of cap((sources.procurement.purchaseOrders ?? []).filter(item => contains(term, item.po_number,
      item.supplier_name, item.supplier_reference, item.status, item.currency)))) {
      results.push({ type: 'purchase-order', key: 'purchase-order:' + order.id, title: order.po_number,
        subtitle: join(order.supplier_name, order.status, order.currency), href: '/admin/supply' });
    }
    for (const quote of cap((sources.procurement.quotations ?? []).filter(item => contains(term, item.quotation_number,
      item.supplier_name, item.supplier_reference, item.status, item.currency)))) {
      results.push({ type: 'quotation', key: 'quotation:' + quote.id, title: quote.quotation_number,
        subtitle: join(quote.supplier_name, quote.status, quote.currency), href: '/admin/supply' });
    }
  }
  if (sources.serviceCases) {
    for (const item of cap(sources.serviceCases.filter(row => contains(term, row.caseNumber, row.frameNumber, row.sku,
      row.title, row.description, row.category, row.status)))) {
      results.push({ type: 'service-case', key: 'service-case:' + item.id, title: item.caseNumber,
        subtitle: join(item.frameNumber, item.sku, item.title, item.status),
        href: recordId(item.id) ? adminRecordHref('service', item.id) : '/admin/after-sales' });
    }
  }
  if (sources.finance) {
    for (const item of cap((sources.finance.documents ?? []).filter(row => contains(term, row.document_number,
      row.partner_name, row.document_type, row.external_reference, row.status)))) {
      results.push({ type: 'finance-document', key: 'finance-document:' + item.id, title: item.document_number,
        subtitle: join(item.partner_name, item.document_type, item.status), href: '/admin/finance' });
    }
    for (const item of cap((sources.finance.obligations ?? []).filter(row => contains(term, row.obligation_number,
      row.partner_name, row.direction, row.settlement_status, row.currency)))) {
      results.push({ type: 'obligation', key: 'obligation:' + item.id, title: item.obligation_number,
        subtitle: join(item.partner_name, item.direction, item.settlement_status, item.currency),
        href: '/admin/finance' });
    }
  }

  return results;
}
