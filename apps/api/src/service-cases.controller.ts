import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { CreateServiceCaseInput, TransitionServiceCaseInput, RecordServiceActivityInput } from '@alsvid/service';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { serviceCaseService } from './runtime.js';

@Controller('v1/service/cases')
export class ServiceCasesController {
 @Get()
 list(@Req() request:AuthenticatedRequest) {
  return serviceCaseService.list(requireAuth(request)).then(data=>({data}));
 }
 @Get(':id')
 detail(@Req() request:AuthenticatedRequest,@Param('id') id:string) {
  return serviceCaseService.detail(requireAuth(request),id).then(data=>({data}));
 }
 @Post()
 create(@Req() request:AuthenticatedRequest,@Body() input:CreateServiceCaseInput) {
  return serviceCaseService.create(requireAuth(request),input).then(data=>({data}));
 }
 @Post(':id/activities')
 recordActivity(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:RecordServiceActivityInput) {
  return serviceCaseService.recordActivity(requireAuth(request),id,input).then(data=>({data}));
 }
 @Post(':id/transition')
 transition(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:TransitionServiceCaseInput) {
  return serviceCaseService.transition(requireAuth(request),id,input).then(data=>({data}));
 }
}
