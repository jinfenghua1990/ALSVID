import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { procurementService } from './runtime.js';

@Controller('v1/procurement')
export class ProcurementController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    try { return { data: await procurementService.summary(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('quotations')
  async createQuotation(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await procurementService.createQuotation(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('quotations/:id/status')
  async quotationStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: { status?: 'RECEIVED'|'ACCEPTED'|'REJECTED'|'EXPIRED' }) {
    if (!input?.status) return throwHttpDomainError(new Error('status is required'));
    try { return { data: await procurementService.setQuotationStatus(requireAuth(request), id, input.status) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('purchase-orders')
  async createPurchaseOrder(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await procurementService.createPurchaseOrder(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('purchase-orders/:id/issue')
  async issue(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await procurementService.issuePurchaseOrder(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('purchase-orders/:id/confirm')
  async confirm(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await procurementService.confirmPurchaseOrder(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('purchase-orders/:id/receipts')
  async receipt(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await procurementService.recordReceipt(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
