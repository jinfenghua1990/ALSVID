import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssetConflictError, AssetValidationError } from '@alsvid/assets';
import { EngineeringConflictError, EngineeringNotFoundError, EngineeringValidationError } from '@alsvid/engineering';
import { PermissionDeniedError } from '@alsvid/identity';
import { PartnerConflictError, PartnerNotFoundError, PartnerValidationError } from '@alsvid/partners';
import { ProcurementConflictError, ProcurementNotFoundError, ProcurementValidationError } from '@alsvid/procurement';
import { ProductConflictError, ProductNotFoundError, ProductValidationError } from '@alsvid/product';

export function throwHttpDomainError(error: unknown): never {
  if (error instanceof PermissionDeniedError) throw new ForbiddenException(error.message);
  if (error instanceof PartnerValidationError || error instanceof ProductValidationError || error instanceof EngineeringValidationError || error instanceof AssetValidationError || error instanceof ProcurementValidationError) throw new BadRequestException(error.message);
  if (error instanceof PartnerNotFoundError || error instanceof ProductNotFoundError || error instanceof EngineeringNotFoundError || error instanceof ProcurementNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof PartnerConflictError || error instanceof ProductConflictError || error instanceof EngineeringConflictError || error instanceof AssetConflictError || error instanceof ProcurementConflictError) throw new ConflictException(error.message);
  if (error instanceof Error) throw new BadRequestException(error.message);
  throw error;
}
