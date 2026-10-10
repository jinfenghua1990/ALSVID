import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { logisticsService } from './runtime.js';

@Controller('v1/logistics')
export class LogisticsController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    try { return { data: await logisticsService.summary(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments')
  async createShipment(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await logisticsService.createShipment(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/cargo')
  async allocateCargo(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.allocateCargo(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('cargo/:id/remove')
  async removeCargo(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { await logisticsService.removeCargo(requireAuth(request), id); return { data: { removed: true } }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/release')
  async releaseShipment(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await logisticsService.releaseShipment(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/dispatch')
  async dispatchShipment(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await logisticsService.dispatchShipment(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/milestones')
  async milestone(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.addMilestone(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/cancel')
  async cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.cancelShipment(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/receive-germany')
  async receiveGermany(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await logisticsService.receiveGermanyShipment(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('shipments/:id/customs')
  async createCustoms(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.createCustomsDeclaration(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('customs/:id/update')
  async updateCustoms(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.updateCustomsDraft(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('customs/:id/lines')
  async customsLine(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.addCustomsLine(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('customs/:id/events')
  async customsEvent(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await logisticsService.addCustomsEvent(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
