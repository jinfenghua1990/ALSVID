import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { serviceCaseService } from './runtime.js';
import type { OwnerServiceSubmissionInput } from '@alsvid/service';

/** Customer-only sanitized projection; never exposes internal case notes or staff evidence. */
@Controller('v1/my/service')
export class MyOwnerServiceController {
 @Post('cases')
 async submit(@Req() request:AuthenticatedRequest,@Body() body:OwnerServiceSubmissionInput) {
  return {data:await serviceCaseService.ownerCreateCase(requireAuth(request),body)};
 }
 @Get('cases')
 async list(@Req() request:AuthenticatedRequest) {
  return {data:await serviceCaseService.ownerCases(requireAuth(request))};
 }
}
