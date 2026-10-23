import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WarehouseProviderCapability as Capability,
  WarehouseProviderRegistry,
  type WarehouseProviderAdapter,
} from './application/provider-adapter.js';

function inventoryAdapter(providerCode = 'TEST_3PL'): WarehouseProviderAdapter {
  return {
    providerCode,
    capabilities: [Capability.InventorySnapshot],
    async testConnection() {
      return { providerCode, accountRef: 'test-account', checkedAt: '2026-10-23T00:00:00.000Z', ok: true };
    },
    async fetchInventorySnapshot({ externalWarehouseId }) {
      return {
        items: [],
        asOf: '2026-10-23T00:00:00.000Z',
        sourceRef: `snapshot:${externalWarehouseId}`,
      };
    },
  };
}

test('registry only exposes adapters whose declared capabilities are implemented', () => {
  const registry = new WarehouseProviderRegistry();
  const adapter = inventoryAdapter();
  registry.register(adapter);

  assert.equal(registry.get('test_3pl'), adapter);
  assert.deepEqual(registry.list(), [{ providerCode: 'TEST_3PL', capabilities: [Capability.InventorySnapshot] }]);
  assert.equal(registry.get('UNKNOWN_PROVIDER'), null);
});

test('registry rejects a capability without its corresponding method', () => {
  const registry = new WarehouseProviderRegistry();
  const incomplete = {
    providerCode: 'INCOMPLETE_3PL',
    capabilities: [Capability.FulfillmentRequest],
    async testConnection() {
      return { providerCode: 'INCOMPLETE_3PL', accountRef: 'test-account', checkedAt: '2026-10-23T00:00:00.000Z', ok: true };
    },
  } as unknown as WarehouseProviderAdapter;

  assert.throws(() => registry.register(incomplete), /declares fulfillment\.request without implementing requestFulfillment/);
  assert.equal(registry.get('INCOMPLETE_3PL'), null);
});

test('registry rejects duplicate provider codes instead of silently replacing an adapter', () => {
  const registry = new WarehouseProviderRegistry();
  registry.register(inventoryAdapter());
  assert.throws(() => registry.register(inventoryAdapter()), /already registered/);
  assert.equal(registry.list().length, 1);
});

test('provider codes must be canonical uppercase identifiers', () => {
  const registry = new WarehouseProviderRegistry();
  assert.throws(() => registry.register(inventoryAdapter('demo-3pl')), /Provider code must be uppercase/);
});
