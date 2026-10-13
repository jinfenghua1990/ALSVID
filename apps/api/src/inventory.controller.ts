import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { MovementInput, ReservationInput, ReservationIssueInput } from '@alsvid/inventory';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { inventoryService } from './runtime.js';

@Controller('v1/inventory')
export class InventoryController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    try { return { data: await inventoryService.summary(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('movements')
  async movement(@Req() request: AuthenticatedRequest, @Body() input: MovementInput) {
    try { return { data: await inventoryService.postMovement(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('reservations')
  async reservation(@Req() request: AuthenticatedRequest, @Body() input: ReservationInput) {
    try { return { data: await inventoryService.createReservation(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('reservations/:id/release')
  async release(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await inventoryService.releaseReservation(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('reservations/:id/issue')
  async issue(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ReservationIssueInput) {
    try { return { data: await inventoryService.issueReservation(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
