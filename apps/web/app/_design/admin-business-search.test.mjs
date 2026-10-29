import assert from 'node:assert/strict';
import test from 'node:test';
import {searchAuthorizedBusinessRecords} from './admin-business-search.ts';

const catalog = {
  models: [{id: 'm1', code: 'FC1', name: 'Folding Carbon'}],
  skus: [{id: 'sku1', sku: 'FC1-PRO-GRAY', name: 'FC1 Pro Graphite'}],
};
const orderId = '423e4567-e89b-42d3-a456-426614174000';
const orders = [{
  id: orderId,
  orderNumber: 'AL-2026-0001',
  customerEmail: 'buyer@example.com',
  lines: [{skuCode: 'FC1-PRO-GRAY', skuName: 'FC1 Pro Graphite'}],
}];

const customerId = '123e4567-e89b-42d3-a456-426614174000';
const vehicleId = '223e4567-e89b-42d3-a456-426614174000';
const caseId = '323e4567-e89b-42d3-a456-426614174000';
const sources = {
  partners: [{
    id: customerId, partnerCode: 'DL-100', displayName: 'Berlin Dealer',
    countryCode: 'DE', roles: ['DEALER'], status: 'ACTIVE',
  }, {
    id: customerId, partnerCode: 'CUS-100', displayName: 'Customer Record',
    countryCode: 'AT', roles: ['CUSTOMER'], status: 'ACTIVE',
  }],
  production: [{
    id: 'production-1', production_order_number: 'MO-2026-010',
    sku: 'FC1-PRO-GRAY', build_spec_code: 'BS-FC1-V1', factory_name: 'Factory A', status: 'IN_PROGRESS',
  }],
  vehicles: [{
    id: vehicleId, vehicle_code: 'VEH-001', frame_number: 'ALS-FC1-000001',
    sku: 'FC1-PRO-GRAY', production_order_number: 'MO-2026-010', factory_name: 'Factory A',
  }],
  inventory: [{
    item_kind: 'SKU', sku: 'RACK-SKU-02', sku_name: 'Rear Rack',
    warehouse_code: 'DE-01', warehouse_name: 'Germany Warehouse',
    location_code: 'A-02', location_name: 'Shelf A-02',
    part_number: null, part_name: null, frame_number: null,
  }],
  procurement: {
    purchaseOrders: [{
      id: 'po-1', po_number: 'PO-2026-010', supplier_name: 'Parts Supplier',
      supplier_reference: 'SUP-REF-1', status: 'CONFIRMED', currency: 'EUR',
    }],
    quotations: [{
      id: 'quote-1', quotation_number: 'QT-2026-010', supplier_name: 'Parts Supplier',
      supplier_reference: 'QUOTE-REF-1', status: 'ACCEPTED', currency: 'EUR',
    }],
  },
  serviceCases: [{
    id: caseId, caseNumber: 'SR-2026-010', vehicleId, frameNumber: 'ALS-FC1-000001',
    sku: 'FC1-PRO-GRAY', title: 'Brake noise', description: 'Front brake inspection',
    category: 'ISSUE', status: 'NEW',
  }],
  finance: {
    documents: [{
      id: 'finance-document-1', document_number: 'INV-2026-010', partner_name: 'Parts Supplier',
      document_type: 'INVOICE', external_reference: 'EXT-INV-010', status: 'DRAFT',
    }],
    obligations: [{
      id: 'obligation-1', obligation_number: 'AR-2026-010', partner_name: 'Berlin Dealer',
      direction: 'AR', settlement_status: 'OPEN', currency: 'EUR',
    }],
  },
};

test('search real accessible model and SKU; return working prefiltered Admin links', () => {
  const items = searchAuthorizedBusinessRecords(catalog, orders, 'fc1');
  assert.deepEqual(items.map(i => i.type), ['model', 'sku', 'order']);
  assert.equal(items[0].href, '/admin/product?type=BIKE&search=FC1#vehicle-models');
  assert.equal(items[1].href, '/admin/product?type=BIKE&search=FC1-PRO-GRAY#vehicle-models');
  assert.equal(items[2].href, '/admin/ecommerce/orders?orderId=' + orderId);
});

test('first-party orders deep link into the self-built storefront workspace, never the external one', () => {
  for (const search of ['fc1', 'al-2026-0001', 'buyer@example.com']) {
    const order = searchAuthorizedBusinessRecords(catalog, orders, search).find(i => i.type === 'order');
    assert.ok(order, search);
    assert.match(order.href, /^\/admin\/ecommerce\/orders\?/);
    assert.doesNotMatch(order.href, /^\/admin\/orders/);
  }
  const withoutId = searchAuthorizedBusinessRecords(catalog,
    [{ orderNumber: 'AL-2026-0002', customerEmail: 'buyer@example.com', lines: [] }], 'al-2026-0002');
  assert.equal(withoutId[0].href, '/admin/ecommerce/orders?orderSearch=AL-2026-0002');
});

test('search case-insensitive order number and permitted customer email', () => {
  const items = searchAuthorizedBusinessRecords(catalog, orders, 'BUYER@EXAMPLE.COM');
  assert.deepEqual(items.map(i => i.type), ['order']);
  assert.equal(items[0].title, 'AL-2026-0001');
});

test('global search covers authorized partner, production, VIN, inventory, procurement, service and finance records', () => {
  const cases = [
    ['DL-100', 'partner', '/admin/dealers'],
    ['BS-FC1-V1', 'production', '/admin/production'],
    ['VEH-001', 'vehicle', '/admin/production/vin-detail?vehicleId=' + vehicleId],
    ['RACK-SKU-02', 'inventory', '/admin/inventory'],
    ['PO-2026-010', 'purchase-order', '/admin/supply'],
    ['QT-2026-010', 'quotation', '/admin/supply'],
    ['SR-2026-010', 'service-case', '/admin/after-sales?caseId=' + caseId],
    ['INV-2026-010', 'finance-document', '/admin/finance'],
    ['AR-2026-010', 'obligation', '/admin/finance'],
  ];
  for (const [query, type, href] of cases) {
    const result = searchAuthorizedBusinessRecords(null, null, query, sources);
    assert.equal(result.length, 1, query);
    assert.equal(result[0].type, type, query);
    assert.equal(result[0].href, href, query);
  }
});

test('customer search uses the authorized customer record deep link', () => {
  const result = searchAuthorizedBusinessRecords(null, null, 'CUS-100', sources);
  assert.equal(result[0].type, 'partner');
  assert.equal(result[0].href, '/admin/customers?partnerId=' + customerId);
});

test('unavailable sources never become fake zero-result records', () => {
  assert.deepEqual(searchAuthorizedBusinessRecords(null, null, 'fc1'), []);
  assert.deepEqual(searchAuthorizedBusinessRecords(catalog, null, 'al-2026'), []);
  assert.deepEqual(searchAuthorizedBusinessRecords(null, orders, 'fc1').map(i => i.type), ['order']);
  assert.deepEqual(searchAuthorizedBusinessRecords(null, null, 'PO-2026-010', {procurement: null}), []);
  assert.deepEqual(searchAuthorizedBusinessRecords(null, null, 'F'), []);
});

test('cap each record type and never mutate authorized snapshots', () => {
  const larger = {models: Array.from({length: 15}, (_, i) => ({id: String(i), code: 'FC1-' + i, name: 'FC1'})), skus: []};
  const before = JSON.stringify(larger);
  assert.equal(searchAuthorizedBusinessRecords(larger, null, 'FC1').length, 8);
  assert.equal(JSON.stringify(larger), before);
});
