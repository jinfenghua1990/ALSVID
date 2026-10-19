import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFrameNumber, VehicleValidationError } from './index.js';

test('frame numbers normalize to stable uppercase identity', () => {
  assert.equal(normalizeFrameNumber(' als-fc1-0001 '), 'ALS-FC1-0001');
  assert.equal(normalizeFrameNumber('AB 1234'), 'AB1234');
});

test('frame numbers reject ambiguous punctuation', () => {
  assert.throws(() => normalizeFrameNumber('A/B/1'), VehicleValidationError);
});

test('VIN detail is primary-key lookup with read permission, never a list scan', async () => {
  const { VehicleService } = await import('./application/vehicle-service.js');
  const { VehicleNotFoundError } = await import('./core/errors.js');
  const vehicleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const repo = {
    list: async () => { throw new Error('detail must never load all vehicles'); },
    get: async (id: string) => id === vehicleId ? { id, frame_number: 'ALS-FC1-001' } : null,
  } as unknown as import('./application/ports.js').VehicleRepository;
  const audit = {record:async()=>{}} as import('./application/ports.js').VehicleAuditPort;
  const service = new VehicleService(repo,audit);
  const actor = {userId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',permissions:['vehicle.read']};
  const record = await service.get(actor,vehicleId);
  assert.equal(record.frame_number,'ALS-FC1-001');
  await assert.rejects(service.get(actor,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),VehicleNotFoundError);
  await assert.rejects(service.get(actor,'invalid-id'),VehicleValidationError);
  await assert.rejects(service.get({...actor,permissions:[]},vehicleId),{code:'VEHICLE_FORBIDDEN'});
});
