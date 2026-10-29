import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { MovementInput, ReservationInput, ReservationIssueInput } from '@alsvid/inventory';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { inventoryService } from './runtime.js';

@Controller('v1/inventory')
export class InventoryController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    return { data: await inventoryService.summary(requireAuth(request)) };
  }

  @Post('movements')
  async movement(@Req() request: AuthenticatedRequest, @Body() input: MovementInput) {
    return { data: await inventoryService.postMovement(requireAuth(request), input) };
  }

  @Post('reservations')
  async reservation(@Req() request: AuthenticatedRequest, @Body() input: ReservationInput) {
    return { data: await inventoryService.createReservation(requireAuth(request), input) };
  }

  @Post('reservations/:id/release')
  async release(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await inventoryService.releaseReservation(requireAuth(request), id) };
  }

  @Post('reservations/:id/issue')
  async issue(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ReservationIssueInput) {
    return { data: await inventoryService.issueReservation(requireAuth(request), id, input) };
  }
}
