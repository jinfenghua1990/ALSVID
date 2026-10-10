import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { financeService } from './runtime.js';

@Controller('v1/finance')
export class FinanceController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    return { data: await financeService.summary(requireAuth(request)) };
  }

  @Post('documents')
  async createDocument(@Req() request: AuthenticatedRequest, @Body() input: any) {
    return { data: await financeService.createDocument(requireAuth(request), input) };
  }

  @Post('documents/:id/verify')
  async verifyDocument(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.verifyDocument(requireAuth(request), id, Number(input.expectedVersion)) };
  }

  @Post('documents/:id/draft')
  async returnDocumentToDraft(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.returnDocumentToDraft(requireAuth(request), id, Number(input.expectedVersion)) };
  }

  @Post('documents/:id/post')
  async postDocument(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.postDocument(requireAuth(request), id, Number(input.expectedVersion)) };
  }

  @Post('documents/:id/void')
  async voidDocument(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.voidDocument(requireAuth(request), id, Number(input.expectedVersion), input.reason) };
  }

  @Post('obligations')
  async createObligation(@Req() request: AuthenticatedRequest, @Body() input: any) {
    return { data: await financeService.createObligation(requireAuth(request), input) };
  }

  @Post('obligations/:id/void')
  async voidObligation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.voidObligation(requireAuth(request), id, input.reason) };
  }

  @Post('payments')
  async createPayment(@Req() request: AuthenticatedRequest, @Body() input: any) {
    return { data: await financeService.createPayment(requireAuth(request), input) };
  }

  @Post('payments/:id/reverse')
  async reversePayment(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.reversePayment(requireAuth(request), id, input.reason) };
  }

  @Post('fx')
  async createFxRate(@Req() request: AuthenticatedRequest, @Body() input: any) {
    return { data: await financeService.createFxRate(requireAuth(request), input) };
  }

  @Post('allocations')
  async allocatePayment(@Req() request: AuthenticatedRequest, @Body() input: any) {
    return { data: await financeService.allocatePayment(requireAuth(request), input) };
  }

  @Post('allocations/:id/reverse')
  async reverseAllocation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.reverseAllocation(requireAuth(request), id, input.reason) };
  }

  @Post('landed-cost')
  async createLandedCostBatch(@Req() request: AuthenticatedRequest, @Body() input: any) {
    return { data: await financeService.createLandedCostBatch(requireAuth(request), input) };
  }

  @Post('landed-cost/:id/components')
  async addLandedCostComponent(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.addLandedCostComponent(requireAuth(request), id, input) };
  }

  @Post('landed-cost/components/:id/allocations')
  async allocateLandedCost(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    return { data: await financeService.allocateLandedCost(requireAuth(request), id, input) };
  }

  @Post('landed-cost/:id/finalize')
  async finalizeLandedCostBatch(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await financeService.finalizeLandedCostBatch(requireAuth(request), id) };
  }
}
