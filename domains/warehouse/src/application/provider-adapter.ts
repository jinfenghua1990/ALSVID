export const WarehouseProviderCapability = {
  WarehouseList: 'warehouse.list',
  InventorySnapshot: 'inventory.snapshot',
  FulfillmentRequest: 'fulfillment.request',
  FulfillmentStatus: 'fulfillment.status',
  ShipmentTracking: 'shipment.tracking',
} as const;

export type WarehouseProviderCapability = typeof WarehouseProviderCapability[keyof typeof WarehouseProviderCapability];
export type WarehouseProviderConnectionStatus = 'NOT_CONFIGURED' | 'PENDING_REVIEW' | 'CONNECTED' | 'ERROR';

export interface ProviderConnectionProbe {
  providerCode: string;
  accountRef: string;
  checkedAt: string;
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface ExternalWarehouseReference {
  externalWarehouseId: string;
  code: string;
  name: string;
  countryCode: string;
  timezone: string;
}

export interface ExternalInventoryRow {
  externalWarehouseId: string;
  externalItemId: string;
  externalSku: string;
  onHand: string;
  allocated: string;
  blocked: string;
  available: string;
  unit: string;
  asOf: string;
  sourceRef: string;
}

export interface InventorySnapshotPage {
  items: readonly ExternalInventoryRow[];
  asOf: string;
  sourceRef: string;
  nextCursor?: string;
}

export interface ProviderFulfillmentLine {
  internalSkuId: string;
  externalSku: string;
  quantity: string;
  unit: string;
}

export interface ProviderFulfillmentRequest {
  internalOrderId: string;
  idempotencyKey: string;
  externalWarehouseId: string;
  lines: readonly ProviderFulfillmentLine[];
  destination: {
    countryCode: string;
    postalCode: string;
    city: string;
    addressLines: readonly string[];
  };
}

export interface ProviderFulfillmentSubmission {
  externalFulfillmentId: string;
  acceptedAt: string;
  status: string;
  sourceRef: string;
}

export interface ProviderFulfillmentStatus {
  externalFulfillmentId: string;
  status: string;
  updatedAt: string;
  trackingNumber?: string;
  carrierCode?: string;
  sourceRef: string;
}

export interface ProviderShipmentTracking {
  trackingNumber: string;
  carrierCode: string;
  status: string;
  updatedAt: string;
  sourceRef: string;
}

/**
 * Provider-neutral contract only. A provider is not considered connected merely
 * because an adapter exists; credentials, a successful probe, mappings and
 * freshness checks must be persisted and audited by a later integration service.
 * Secret values must never be passed to browser code or stored on this adapter.
 */
export interface WarehouseProviderAdapter {
  readonly providerCode: string;
  readonly capabilities: readonly WarehouseProviderCapability[];
  testConnection(): Promise<ProviderConnectionProbe>;
  listWarehouses?: () => Promise<readonly ExternalWarehouseReference[]>;
  fetchInventorySnapshot?: (input: { externalWarehouseId: string; cursor?: string }) => Promise<InventorySnapshotPage>;
  requestFulfillment?: (input: ProviderFulfillmentRequest) => Promise<ProviderFulfillmentSubmission>;
  fetchFulfillmentStatus?: (input: { externalFulfillmentId: string }) => Promise<ProviderFulfillmentStatus>;
  fetchShipmentTracking?: (input: { carrierCode: string; trackingNumber: string }) => Promise<ProviderShipmentTracking>;
}

const capabilityMethod: Record<WarehouseProviderCapability, keyof WarehouseProviderAdapter> = {
  [WarehouseProviderCapability.WarehouseList]: 'listWarehouses',
  [WarehouseProviderCapability.InventorySnapshot]: 'fetchInventorySnapshot',
  [WarehouseProviderCapability.FulfillmentRequest]: 'requestFulfillment',
  [WarehouseProviderCapability.FulfillmentStatus]: 'fetchFulfillmentStatus',
  [WarehouseProviderCapability.ShipmentTracking]: 'fetchShipmentTracking',
};

export function validateWarehouseProviderAdapter(adapter: WarehouseProviderAdapter): void {
  if (!adapter || typeof adapter !== 'object') throw new Error('Warehouse provider adapter is required');
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(adapter.providerCode)) {
    throw new Error('Provider code must be uppercase and use 2-64 letters, numbers, dots, underscores or hyphens');
  }
  if (typeof adapter.testConnection !== 'function') {
    throw new Error(`Provider ${adapter.providerCode} must implement testConnection()`);
  }
  if (!Array.isArray(adapter.capabilities)) {
    throw new Error(`Provider ${adapter.providerCode} must declare its supported capabilities`);
  }
  const declaredCapabilities = adapter.capabilities as readonly WarehouseProviderCapability[];
  const uniqueCapabilities = new Set<WarehouseProviderCapability>(declaredCapabilities);
  if (uniqueCapabilities.size !== adapter.capabilities.length) {
    throw new Error(`Provider ${adapter.providerCode} declares duplicate capabilities`);
  }
  for (const capability of uniqueCapabilities) {
    if (!Object.hasOwn(capabilityMethod, capability)) {
      throw new Error(`Provider ${adapter.providerCode} declares an unknown capability: ${String(capability)}`);
    }
    const method = capabilityMethod[capability];
    if (typeof adapter[method] !== 'function') {
      throw new Error(`Provider ${adapter.providerCode} declares ${capability} without implementing ${String(method)}()`);
    }
  }
}

export class WarehouseProviderRegistry {
  private readonly adapters = new Map<string, WarehouseProviderAdapter>();

  register(adapter: WarehouseProviderAdapter): void {
    validateWarehouseProviderAdapter(adapter);
    if (this.adapters.has(adapter.providerCode)) {
      throw new Error(`Warehouse provider is already registered: ${adapter.providerCode}`);
    }
    this.adapters.set(adapter.providerCode, adapter);
  }

  get(providerCode: string): WarehouseProviderAdapter | null {
    return this.adapters.get(providerCode.trim().toUpperCase()) ?? null;
  }

  list(): readonly { providerCode: string; capabilities: readonly WarehouseProviderCapability[] }[] {
    return [...this.adapters.values()]
      .map(adapter => ({ providerCode: adapter.providerCode, capabilities: [...adapter.capabilities] }))
      .sort((a, b) => a.providerCode.localeCompare(b.providerCode));
  }
}
