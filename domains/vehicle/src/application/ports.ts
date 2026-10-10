import type { QueryExecutor } from '@alsvid/database';

export interface VehicleActor { userId: string; permissions: readonly string[] }

export interface VehicleAuditPort {
  record(
    input: { actorUserId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> },
    executor?: QueryExecutor,
  ): Promise<void>;
}

export interface VehicleRepository {
  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T>;
  list(): Promise<any[]>;
  findByReference(reference: string): Promise<any | null>;
  get360(vehicleId: string): Promise<any | null>;
  garage(partnerId: string): Promise<any[]>;
  lockVehicle(vehicleId: string, executor: QueryExecutor): Promise<any | null>;
  currentOwner(vehicleId: string, executor: QueryExecutor): Promise<any | null>;
  lockBirthCandidate(unitId: string, executor: QueryExecutor): Promise<any | null>;
  latestQc(unitId: string, executor: QueryExecutor): Promise<any | null>;
  createVehicle(
    input: { frameNumber: string; unitId: string; productionOrderId: string; buildSpecId: string; skuId: string; factoryPartnerId: string; birthQcInspectionId: string; actorUserId: string },
    executor: QueryExecutor,
  ): Promise<any>;
  createHandover(
    input: { vehicleId: string; dealerPartnerId: string; customerPartnerId: string; handedOverAt: string; reference: string | null; note: string; evidence: Record<string, unknown>; actorUserId: string },
    executor: QueryExecutor,
  ): Promise<any>;
  appendOwnership(
    input: { vehicleId: string; eventType: 'ACQUIRED' | 'RELEASED'; ownerPartnerId: string; counterpartyPartnerId: string | null; handoverId: string | null; occurredAt: string; reason: string; metadata: Record<string, unknown>; actorUserId: string },
    executor: QueryExecutor,
  ): Promise<any>;
  appendLifecycle(
    input: { vehicleId: string; state: 'HANDED_OVER' | 'OWNED' | 'UNOWNED' | 'RETIRED'; eventType: 'CUSTOMER_HANDOVER' | 'OWNERSHIP_ACQUIRED' | 'OWNERSHIP_RELEASED' | 'OWNERSHIP_TRANSFERRED' | 'RETIRED'; sourceType: 'HANDOVER' | 'OWNERSHIP'; sourceId: string | null; occurredAt: string; note: string; metadata: Record<string, unknown>; actorUserId: string },
    executor: QueryExecutor,
  ): Promise<any>;
}
