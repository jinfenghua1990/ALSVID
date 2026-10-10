import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { vehicleService } from './runtime.js';

@Controller('v1/vehicles')
export class VehicleController {
  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    try { return { data: await vehicleService.list(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('birth')
  async birth(@Req() request: AuthenticatedRequest, @Body() input: { productionUnitId?: string; frameNumber?: string }) {
    if (!input?.productionUnitId || !input.frameNumber) return throwHttpDomainError(new Error('productionUnitId and frameNumber are required'));
    try { return { data: await vehicleService.birth(requireAuth(request), input.productionUnitId, input.frameNumber) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
