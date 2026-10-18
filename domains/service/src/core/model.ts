export const ServiceCaseCapabilities = { Read: 'service.read', Write: 'service.write' } as const;
export const ServiceCaseStatuses = ['NEW','TRIAGED','IN_PROGRESS','RESOLVED','CLOSED'] as const;
export type ServiceCaseStatus = (typeof ServiceCaseStatuses)[number];
export type ServiceCaseCategory = 'ISSUE'|'WARRANTY_REVIEW'|'REPAIR_REQUEST';
export interface ServiceCase {
  id: string;
  caseNumber: string;
  vehicleId: string;
  frameNumber: string;
  sku: string;
  category: ServiceCaseCategory;
  title: string;
  description: string;
  status: ServiceCaseStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface ServiceCaseHistory {
 id: string; caseId: string; fromStatus: ServiceCaseStatus|null; toStatus: ServiceCaseStatus;
 caseVersion: number; actorUserId: string; reason: string; occurredAt: string;
}
export type CreateServiceCaseInput = { vehicleId: string; category: ServiceCaseCategory; title: string; description?: string };
export type TransitionServiceCaseInput = { expectedVersion: number; toStatus: ServiceCaseStatus; reason: string };
