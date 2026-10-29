import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { vehicleService } from './runtime.js';

@Controller('v1/vehicles')
export class VehicleController {
  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { data: await vehicleService.list(requireAuth(request)) };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await vehicleService.get(requireAuth(request), id) };
  }

  @Post('birth')
  async birth(@Req() request: AuthenticatedRequest, @Body() input: { productionUnitId?: string; frameNumber?: string }) {
    if (!input?.productionUnitId || !input.frameNumber) throw new BadRequestException('productionUnitId and frameNumber are required');
    return { data: await vehicleService.birth(requireAuth(request), input.productionUnitId, input.frameNumber) };
  }
}
