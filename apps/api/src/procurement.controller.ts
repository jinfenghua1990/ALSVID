import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { ConfirmationLineInput, ProcurementLineInput, ReceiptLineInput } from '@alsvid/procurement';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { procurementService } from './runtime.js';

interface CreateQuotationBody { supplierPartnerId: string; supplierReference?: string; currency: string; validUntil?: string; incoterm?: string; paymentTerms?: string; lines: ProcurementLineInput[] }
interface CreatePurchaseOrderBody { supplierPartnerId: string; sourceQuotationId?: string; supplierReference?: string; currency: string; incoterm?: string; paymentTerms?: string; depositTerms?: string; lines: ProcurementLineInput[] }
interface ConfirmOrderBody { supplierReference?: string; note?: string; lines: ConfirmationLineInput[] }
interface RecordReceiptBody { kind: 'PHYSICAL_RECEIPT' | 'FACTORY_COMMITMENT'; reference?: string; occurredOn: string; note?: string; lines: ReceiptLineInput[] }
interface QuotationStatusBody { status?: 'RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' }

@Controller('v1/procurement')
export class ProcurementController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    return { data: await procurementService.summary(requireAuth(request)) };
  }

  @Post('quotations')
  async createQuotation(@Req() request: AuthenticatedRequest, @Body() input: CreateQuotationBody) {
    return { data: await procurementService.createQuotation(requireAuth(request), input) };
  }

  @Post('quotations/:id/status')
  async quotationStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: QuotationStatusBody) {
    if (!input?.status) throw new BadRequestException('status is required');
    return { data: await procurementService.setQuotationStatus(requireAuth(request), id, input.status) };
  }

  @Post('purchase-orders')
  async createPurchaseOrder(@Req() request: AuthenticatedRequest, @Body() input: CreatePurchaseOrderBody) {
    return { data: await procurementService.createPurchaseOrder(requireAuth(request), input) };
  }

  @Post('purchase-orders/:id/issue')
  async issue(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await procurementService.issuePurchaseOrder(requireAuth(request), id) };
  }

  @Post('purchase-orders/:id/confirm')
  async confirm(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ConfirmOrderBody) {
    return { data: await procurementService.confirmPurchaseOrder(requireAuth(request), id, input) };
  }

  @Post('purchase-orders/:id/receipts')
  async receipt(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: RecordReceiptBody) {
    return { data: await procurementService.recordReceipt(requireAuth(request), id, input) };
  }
}
