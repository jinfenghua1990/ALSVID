import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { warehouseService } from './runtime.js';

interface CreateWarehouseBody { code: string; name: string; partnerId?: string; countryCode: string; timezone?: string }
interface CreateLocationBody { warehouseId: string; parentLocationId?: string; code: string; name: string; locationType: string }
interface OpenStocktakeBody { warehouseId: string; note?: string }
interface RecordCountBody { locationId: string; itemKind: 'PART' | 'SKU' | 'VEHICLE'; itemId: string; countedQuantity: string | number; unit: string }

@Controller('v1/warehouse')
export class WarehouseController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    try { return { data: await warehouseService.summary(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('warehouses')
  async warehouse(@Req() request: AuthenticatedRequest, @Body() input: CreateWarehouseBody) {
    try { return { data: await warehouseService.createWarehouse(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('locations')
  async location(@Req() request: AuthenticatedRequest, @Body() input: CreateLocationBody) {
    try { return { data: await warehouseService.createLocation(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('stocktakes')
  async stocktake(@Req() request: AuthenticatedRequest, @Body() input: OpenStocktakeBody) {
    try { return { data: await warehouseService.openStocktake(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('stocktakes/:id/counts')
  async count(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: RecordCountBody) {
    try { return { data: await warehouseService.recordCount(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('stocktakes/:id/close')
  async close(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await warehouseService.closeStocktake(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('stocktakes/:id/cancel')
  async cancel(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await warehouseService.cancelStocktake(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
