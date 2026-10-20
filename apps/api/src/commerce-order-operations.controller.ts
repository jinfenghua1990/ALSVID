import { Body,Controller,Get,Post,Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import type { RequestRefundReviewInput } from '@alsvid/commerce';
import { commerceOrderOperationsService } from './runtime.js';

/** Review only. No paid-state mutation, PSP refund, stock release, or production action. */
@Controller('v1/commerce/operations')
export class CommerceOrderOperationsController {
 @Get('readiness')
 async readiness(@Req() request:AuthenticatedRequest){
  return {data:await commerceOrderOperationsService.readiness(requireAuth(request))};
 }
 @Get('refund-reviews')
 async reviews(@Req() request:AuthenticatedRequest){
  return {data:await commerceOrderOperationsService.refundReviews(requireAuth(request))};
 }
 @Post('refund-reviews')
 async requestReview(@Req() request:AuthenticatedRequest,@Body() input:RequestRefundReviewInput){
  return {data:await commerceOrderOperationsService.requestRefundReview(requireAuth(request),input)};
 }
}
