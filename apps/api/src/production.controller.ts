import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { CreateProductionOrderInput, ProductionDeviationInput, QcInspectionInput } from '@alsvid/production';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { productionService } from './runtime.js';

@Controller('v1/production')
export class ProductionController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    try { return { data: await productionService.summary(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('orders')
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreateProductionOrderInput) {
    try { return { data: await productionService.createOrder(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('orders/from-storefront/:id')
  async createFromStorefront(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: { factoryPartnerId: string }) {
    try { return { data: await productionService.createFromStorefrontOrder(requireAuth(request), id, input.factoryPartnerId) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('orders/:id/release')
  async release(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await productionService.releaseOrder(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('orders/:id/start')
  async start(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await productionService.startOrder(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('orders/:id/qc')
  async qc(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await productionService.moveOrderToQc(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('orders/:id/complete')
  async complete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await productionService.completeOrder(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('units/:id/assembled')
  async assembled(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await productionService.markUnitAssembled(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('units/:id/inspect')
  async inspect(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: QcInspectionInput) {
    try { return { data: await productionService.inspectUnit(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('units/:id/deviations')
  async deviation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ProductionDeviationInput) {
    try { return { data: await productionService.recordDeviation(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
