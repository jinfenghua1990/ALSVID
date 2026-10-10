import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssetConflictError, AssetValidationError } from '@alsvid/assets';
import { CommerceConflictError, CommerceNotFoundError, CommerceValidationError } from '@alsvid/commerce';
import { DealerConflictError, DealerNotFoundError, DealerValidationError } from '@alsvid/dealer';
import { EngineeringConflictError, EngineeringNotFoundError, EngineeringValidationError } from '@alsvid/engineering';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '@alsvid/finance';
import { PermissionDeniedError } from '@alsvid/identity';
import { IntegrationConflictError, IntegrationNotFoundError, IntegrationValidationError } from '@alsvid/integrations';
import { InventoryConflictError, InventoryNotFoundError, InventoryValidationError } from '@alsvid/inventory';
import { LogisticsConflictError, LogisticsNotFoundError, LogisticsValidationError } from '@alsvid/logistics';
import { PartnerConflictError, PartnerNotFoundError, PartnerValidationError } from '@alsvid/partners';
import { ProcurementConflictError, ProcurementNotFoundError, ProcurementValidationError } from '@alsvid/procurement';
import { ProductConflictError, ProductNotFoundError, ProductValidationError } from '@alsvid/product';
import { ProductionConflictError, ProductionNotFoundError, ProductionValidationError } from '@alsvid/production';
import { VehicleConflictError, VehicleNotFoundError, VehicleValidationError } from '@alsvid/vehicle';
import { WarehouseConflictError, WarehouseNotFoundError, WarehouseValidationError } from '@alsvid/warehouse';

export function throwHttpDomainError(error: unknown): never {
  if (error instanceof PermissionDeniedError) throw new ForbiddenException(error.message);
  if (error instanceof PartnerValidationError || error instanceof ProductValidationError || error instanceof EngineeringValidationError || error instanceof AssetValidationError || error instanceof ProcurementValidationError || error instanceof ProductionValidationError || error instanceof VehicleValidationError || error instanceof InventoryValidationError || error instanceof WarehouseValidationError || error instanceof LogisticsValidationError || error instanceof DealerValidationError || error instanceof CommerceValidationError || error instanceof IntegrationValidationError || error instanceof FinanceValidationError) throw new BadRequestException(error.message);
  if (error instanceof PartnerNotFoundError || error instanceof ProductNotFoundError || error instanceof EngineeringNotFoundError || error instanceof ProcurementNotFoundError || error instanceof ProductionNotFoundError || error instanceof VehicleNotFoundError || error instanceof InventoryNotFoundError || error instanceof WarehouseNotFoundError || error instanceof LogisticsNotFoundError || error instanceof DealerNotFoundError || error instanceof CommerceNotFoundError || error instanceof IntegrationNotFoundError || error instanceof FinanceNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof PartnerConflictError || error instanceof ProductConflictError || error instanceof EngineeringConflictError || error instanceof AssetConflictError || error instanceof ProcurementConflictError || error instanceof ProductionConflictError || error instanceof VehicleConflictError || error instanceof InventoryConflictError || error instanceof WarehouseConflictError || error instanceof LogisticsConflictError || error instanceof DealerConflictError || error instanceof CommerceConflictError || error instanceof IntegrationConflictError || error instanceof FinanceConflictError) throw new ConflictException(error.message);
  if (error instanceof Error) throw new BadRequestException(error.message);
  throw error;
}
