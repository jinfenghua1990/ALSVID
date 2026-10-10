import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { VehicleHandoverInput, VehicleOwnershipReleaseInput, VehicleOwnershipTransferInput } from '@alsvid/vehicle';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { vehicleService } from './runtime.js';

@Controller('v1/vehicles')
export class VehicleController {
  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { data: await vehicleService.list(requireAuth(request)) };
  }

  @Get('lookup/:reference')
  async lookup(@Req() request: AuthenticatedRequest, @Param('reference') reference: string) {
    return { data: await vehicleService.lookup(requireAuth(request), reference) };
  }

  @Get('garage/:partnerId')
  async garage(@Req() request: AuthenticatedRequest, @Param('partnerId') partnerId: string) {
    return { data: await vehicleService.garage(requireAuth(request), partnerId) };
  }

  @Get(':id/360')
  async vehicle360(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await vehicleService.get360(requireAuth(request), id) };
  }

  @Post('birth')
  async birth(@Req() request: AuthenticatedRequest, @Body() input: { productionUnitId?: string; frameNumber?: string }) {
    if (!input?.productionUnitId || !input.frameNumber) throw new Error('productionUnitId and frameNumber are required');
    return { data: await vehicleService.birth(requireAuth(request), input.productionUnitId, input.frameNumber) };
  }

  @Post(':id/handover')
  async handover(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: VehicleHandoverInput) {
    return { data: await vehicleService.handover(requireAuth(request), id, input) };
  }

  @Post(':id/ownership/transfer')
  async transferOwnership(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: VehicleOwnershipTransferInput) {
    return { data: await vehicleService.transferOwnership(requireAuth(request), id, input) };
  }

  @Post(':id/ownership/release')
  async releaseOwnership(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: VehicleOwnershipReleaseInput) {
    return { data: await vehicleService.releaseOwnership(requireAuth(request), id, input) };
  }
}
