import type { DatabasePort } from '@alsvid/database';
import { FinanceService } from '../application/finance-service.js';
import type { FinanceAuditPort } from '../application/ports.js';
import { PostgresFinanceRepository } from './postgres-finance-repository.js';
export function createFinanceService(database:DatabasePort,audit:FinanceAuditPort):FinanceService{return new FinanceService(new PostgresFinanceRepository(database),audit)}
