export const IntegrationCapability={Ingest:'integrations.ingest',Replay:'integrations.replay',Admin:'integrations.admin'} as const;
export interface ShopifyDeliveryInput{webhookId:string;eventId?:string;topic:string;shopDomain:string;apiVersion?:string;triggeredAt?:string;payload:Record<string,unknown>}
export type IngestionOutcome='PROCESSED'|'REJECTED'|'NOOP';

export type WarehouseProviderConnectionStatus='NOT_CONFIGURED'|'PENDING_REVIEW'|'CONNECTED'|'ERROR'|'PAUSED';
export type WarehouseProviderMappingStatus='PENDING'|'VERIFIED'|'REJECTED'|'INACTIVE';
export type WarehouseProviderSyncStatus='QUEUED'|'RUNNING'|'SUCCEEDED'|'PARTIAL'|'FAILED'|'CANCELLED';
export interface CreateWarehouseProviderConnectionInput {
  providerCode:string;
  displayName:string;
  accountRef:string;
  credentialsSecretRef?:string;
}
