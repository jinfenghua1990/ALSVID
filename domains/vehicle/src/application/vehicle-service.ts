import { postgresErrorCode } from '@alsvid/database';
import { ForbiddenError } from '@alsvid/kernel';
import {
  VehicleCapability,
  type VehicleHandoverInput,
  type VehicleOwnershipReleaseInput,
  type VehicleOwnershipTransferInput,
} from '../core/model.js';
import { VehicleConflictError, VehicleNotFoundError, VehicleValidationError } from '../core/errors.js';
import { normalizeFrameNumber } from '../core/normalization.js';
import type { VehicleActor, VehicleAuditPort, VehicleRepository } from './ports.js';

export class VehicleService {
  constructor(private readonly repository: VehicleRepository, private readonly audit: VehicleAuditPort) {}

  async list(actor: VehicleActor): Promise<any[]> {
    requireCapability(actor, VehicleCapability.Read);
    return this.repository.list();
  }

  async lookup(actor: VehicleActor, referenceInput: string): Promise<any> {
    requireCapability(actor, VehicleCapability.Read);
    const reference = required(referenceInput, 'reference').toUpperCase();
    const vehicle = await this.repository.findByReference(reference);
    if (!vehicle) throw new VehicleNotFoundError('Vehicle not found');
    return vehicle;
  }

  async get360(actor: VehicleActor, vehicleId: string): Promise<any> {
    requireCapability(actor, VehicleCapability.Read);
    const vehicle = await this.repository.get360(required(vehicleId, 'vehicleId'));
    if (!vehicle) throw new VehicleNotFoundError('Vehicle not found');
    return vehicle;
  }

  async garage(actor: VehicleActor, partnerId: string): Promise<any[]> {
    requireCapability(actor, VehicleCapability.GarageRead);
    return this.repository.garage(required(partnerId, 'partnerId'));
  }

  async birth(actor: VehicleActor, unitId: string, frameNumberInput: string): Promise<any> {
    requireCapability(actor, VehicleCapability.Birth);
    const frameNumber = normalizeFrameNumber(frameNumberInput);
    try {
      return await this.repository.transaction(async (executor) => {
        const unit = await this.repository.lockBirthCandidate(unitId, executor);
        if (!unit) throw new VehicleNotFoundError('Production unit not found');
        if (unit.status !== 'QC_PASSED') throw new VehicleConflictError('Vehicle birth requires QC_PASSED production unit');
        const qc = await this.repository.latestQc(unitId, executor);
        if (!qc || qc.result !== 'PASS') throw new VehicleConflictError('Latest QC inspection must be PASS');
        const created = await this.repository.createVehicle({
          frameNumber,
          unitId,
          productionOrderId: unit.production_order_id,
          buildSpecId: unit.build_spec_id,
          skuId: unit.sku_id,
          factoryPartnerId: unit.factory_partner_id,
          birthQcInspectionId: qc.id,
          actorUserId: actor.userId,
        }, executor);
        await this.audit.record({ actorUserId: actor.userId, action: 'vehicle.born', targetType: 'vehicle', targetId: created.id, metadata: { frameNumber, productionUnitId: unitId } }, executor);
        return created;
      });
    } catch (error) { this.rethrow(error); }
  }

  async handover(actor: VehicleActor, vehicleId: string, input: VehicleHandoverInput): Promise<any> {
    requireCapability(actor, VehicleCapability.Handover);
    const handedOverAt = timestamp(input.handedOverAt, 'handedOverAt');
    try {
      return await this.repository.transaction(async (executor) => {
        const vehicle = await this.repository.lockVehicle(vehicleId, executor);
        if (!vehicle) throw new VehicleNotFoundError('Vehicle not found');
        const currentOwner = await this.repository.currentOwner(vehicleId, executor);
        if (currentOwner?.owner_partner_id) throw new VehicleConflictError('Vehicle already has a current owner');
        const dealerPartnerId = required(input.dealerPartnerId, 'dealerPartnerId');
        const customerPartnerId = required(input.customerPartnerId, 'customerPartnerId');
        const handover = await this.repository.createHandover({
          vehicleId,
          dealerPartnerId,
          customerPartnerId,
          handedOverAt,
          reference: input.reference?.trim() || null,
          note: input.note?.trim() ?? '',
          evidence: input.evidence ?? {},
          actorUserId: actor.userId,
        }, executor);
        const ownership = await this.repository.appendOwnership({
          vehicleId,
          eventType: 'ACQUIRED',
          ownerPartnerId: customerPartnerId,
          counterpartyPartnerId: dealerPartnerId,
          handoverId: handover.id,
          occurredAt: handedOverAt,
          reason: 'Initial dealer-to-customer handover',
          metadata: { handoverNumber: handover.handover_number },
          actorUserId: actor.userId,
        }, executor);
        await this.repository.appendLifecycle({ vehicleId, state: 'HANDED_OVER', eventType: 'CUSTOMER_HANDOVER', sourceType: 'HANDOVER', sourceId: handover.id, occurredAt: handedOverAt, note: input.note?.trim() ?? '', metadata: {}, actorUserId: actor.userId }, executor);
        await this.repository.appendLifecycle({ vehicleId, state: 'OWNED', eventType: 'OWNERSHIP_ACQUIRED', sourceType: 'OWNERSHIP', sourceId: ownership.id, occurredAt: handedOverAt, note: '', metadata: { ownerPartnerId: customerPartnerId }, actorUserId: actor.userId }, executor);
        await this.audit.record({ actorUserId: actor.userId, action: 'vehicle.handed_over', targetType: 'vehicle', targetId: vehicleId, metadata: { handoverId: handover.id, dealerPartnerId, customerPartnerId } }, executor);
        return { handover, ownership };
      });
    } catch (error) { this.rethrow(error); }
  }

  async transferOwnership(actor: VehicleActor, vehicleId: string, input: VehicleOwnershipTransferInput): Promise<any> {
    requireCapability(actor, VehicleCapability.OwnershipWrite);
    const occurredAt = timestamp(input.occurredAt, 'occurredAt');
    const expectedCurrentOwnerPartnerId = required(input.expectedCurrentOwnerPartnerId, 'expectedCurrentOwnerPartnerId');
    const newOwnerPartnerId = required(input.newOwnerPartnerId, 'newOwnerPartnerId');
    try {
      return await this.repository.transaction(async (executor) => {
        const vehicle = await this.repository.lockVehicle(vehicleId, executor);
        if (!vehicle) throw new VehicleNotFoundError('Vehicle not found');
        const current = await this.repository.currentOwner(vehicleId, executor);
        if (!current?.owner_partner_id) throw new VehicleConflictError('Vehicle has no current owner to transfer');
        if (current.owner_partner_id !== expectedCurrentOwnerPartnerId) throw new VehicleConflictError('Vehicle current owner changed; refresh before transfer');
        if (current.owner_partner_id === newOwnerPartnerId) throw new VehicleValidationError('New owner must differ from current owner');
        const released = await this.repository.appendOwnership({ vehicleId, eventType: 'RELEASED', ownerPartnerId: current.owner_partner_id, counterpartyPartnerId: newOwnerPartnerId, handoverId: null, occurredAt, reason: input.reason?.trim() || 'Ownership transfer', metadata: input.metadata ?? {}, actorUserId: actor.userId }, executor);
        const acquired = await this.repository.appendOwnership({ vehicleId, eventType: 'ACQUIRED', ownerPartnerId: newOwnerPartnerId, counterpartyPartnerId: current.owner_partner_id, handoverId: null, occurredAt, reason: input.reason?.trim() || 'Ownership transfer', metadata: input.metadata ?? {}, actorUserId: actor.userId }, executor);
        await this.repository.appendLifecycle({ vehicleId, state: 'OWNED', eventType: 'OWNERSHIP_TRANSFERRED', sourceType: 'OWNERSHIP', sourceId: acquired.id, occurredAt, note: input.reason?.trim() ?? '', metadata: { previousOwnerPartnerId: current.owner_partner_id, newOwnerPartnerId }, actorUserId: actor.userId }, executor);
        await this.audit.record({ actorUserId: actor.userId, action: 'vehicle.ownership_transferred', targetType: 'vehicle', targetId: vehicleId, metadata: { previousOwnerPartnerId: current.owner_partner_id, newOwnerPartnerId } }, executor);
        return { released, acquired };
      });
    } catch (error) { this.rethrow(error); }
  }

  async releaseOwnership(actor: VehicleActor, vehicleId: string, input: VehicleOwnershipReleaseInput): Promise<any> {
    requireCapability(actor, VehicleCapability.OwnershipWrite);
    const occurredAt = timestamp(input.occurredAt, 'occurredAt');
    const expectedCurrentOwnerPartnerId = required(input.expectedCurrentOwnerPartnerId, 'expectedCurrentOwnerPartnerId');
    const reason = required(input.reason, 'reason');
    try {
      return await this.repository.transaction(async (executor) => {
        const vehicle = await this.repository.lockVehicle(vehicleId, executor);
        if (!vehicle) throw new VehicleNotFoundError('Vehicle not found');
        const current = await this.repository.currentOwner(vehicleId, executor);
        if (!current?.owner_partner_id) throw new VehicleConflictError('Vehicle has no current owner to release');
        if (current.owner_partner_id !== expectedCurrentOwnerPartnerId) throw new VehicleConflictError('Vehicle current owner changed; refresh before release');
        const released = await this.repository.appendOwnership({ vehicleId, eventType: 'RELEASED', ownerPartnerId: current.owner_partner_id, counterpartyPartnerId: null, handoverId: null, occurredAt, reason, metadata: input.metadata ?? {}, actorUserId: actor.userId }, executor);
        await this.repository.appendLifecycle({ vehicleId, state: 'UNOWNED', eventType: 'OWNERSHIP_RELEASED', sourceType: 'OWNERSHIP', sourceId: released.id, occurredAt, note: reason, metadata: { previousOwnerPartnerId: current.owner_partner_id }, actorUserId: actor.userId }, executor);
        await this.audit.record({ actorUserId: actor.userId, action: 'vehicle.ownership_released', targetType: 'vehicle', targetId: vehicleId, metadata: { previousOwnerPartnerId: current.owner_partner_id, reason } }, executor);
        return released;
      });
    } catch (error) { this.rethrow(error); }
  }

  private rethrow(error: unknown): never {
    if (error instanceof VehicleNotFoundError || error instanceof VehicleConflictError || error instanceof VehicleValidationError) throw error;
    if (postgresErrorCode(error) === '23505') throw new VehicleConflictError('Vehicle identity, handover or ownership evidence already exists');
    if (postgresErrorCode(error) === '23503') throw new VehicleNotFoundError('Referenced Vehicle/Partner evidence was not found');
    const message = error instanceof Error ? error.message : '';
    if (/Vehicle birth|Vehicle handover|Vehicle owner|Vehicle current owner|ownership|handover|append-only|CUSTOMER Partner|DEALER Partner|chronological/i.test(message)) throw new VehicleConflictError(message);
    throw error;
  }
}

function required(value: unknown, name: string): string {
  const result = String(value ?? '').trim();
  if (!result) throw new VehicleValidationError(`${name} is required`);
  return result;
}

function timestamp(value: unknown, name: string): string {
  const text = required(value, name);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new VehicleValidationError(`${name} must be a valid date/time`);
  return parsed.toISOString();
}

function requireCapability(actor: VehicleActor, capability: string): void {
  if (!actor.permissions.includes(capability)) throw new ForbiddenError('VEHICLE_FORBIDDEN', `Missing permission: ${capability}`);
}
