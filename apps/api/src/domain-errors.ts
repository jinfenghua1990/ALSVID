import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PermissionDeniedError } from '@alsvid/identity';
import { PartnerConflictError, PartnerNotFoundError, PartnerValidationError } from '@alsvid/partners';

export function throwHttpDomainError(error: unknown): never {
  if (error instanceof PermissionDeniedError) throw new ForbiddenException(error.message);
  if (error instanceof PartnerValidationError) throw new BadRequestException(error.message);
  if (error instanceof PartnerNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof PartnerConflictError) throw new ConflictException(error.message);
  if (error instanceof Error) throw new BadRequestException(error.message);
  throw error;
}
