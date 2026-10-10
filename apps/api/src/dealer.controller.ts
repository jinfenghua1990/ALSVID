import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { dealerService } from './runtime.js';

@Controller('v1/dealers')
export class DealerController{
  @Get()
  async summary(@Req() request:AuthenticatedRequest){try{return{data:await dealerService.summary(requireAuth(request))};}catch(error){return throwHttpDomainError(error);}}
  @Post()
  async create(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await dealerService.create(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post(':id/update')
  async update(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await dealerService.update(requireAuth(request),id,input)};}catch(error){return throwHttpDomainError(error);}}
  @Post(':id/status')
  async status(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await dealerService.changeStatus(requireAuth(request),id,input)};}catch(error){return throwHttpDomainError(error);}}
}
