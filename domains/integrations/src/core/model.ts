export const IntegrationCapability={Ingest:'integrations.ingest',Replay:'integrations.replay',Admin:'integrations.admin'} as const;
export interface ShopifyDeliveryInput{webhookId:string;eventId?:string;topic:string;shopDomain:string;apiVersion?:string;triggeredAt?:string;payload:Record<string,unknown>}
export type IngestionOutcome='PROCESSED'|'REJECTED'|'NOOP';
