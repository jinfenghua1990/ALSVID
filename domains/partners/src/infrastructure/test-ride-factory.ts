import type { DatabasePort } from '@alsvid/database';
import { TestRideService } from '../application/test-ride.js';
import { PostgresTestRideRepository } from './postgres-test-ride-repository.js';
export function createTestRideService(db:DatabasePort):TestRideService {
 return new TestRideService(new PostgresTestRideRepository(db));
}
