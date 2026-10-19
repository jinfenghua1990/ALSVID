import { Controller, Get, Req } from '@nestjs/common';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { serviceCaseService } from './runtime.js';

/** Customer-only sanitized projection; never exposes internal case notes or staff evidence. */
@Controller('v1/my/service')
export class MyOwnerServiceController {
 @Get('cases')
 async list(@Req() request:AuthenticatedRequest) {
  return {data:await serviceCaseService.ownerCases(requireAuth(request))};
 }
}
