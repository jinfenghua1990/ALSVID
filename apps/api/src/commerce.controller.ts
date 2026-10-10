import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { commerceService } from './runtime.js';

@Controller('v1/commerce')
export class CommerceController{
  @Get()
  async summary(@Req() request:AuthenticatedRequest){try{return{data:await commerceService.summary(requireAuth(request))};}catch(error){return throwHttpDomainError(error);}}
  @Post('channels')
  async createChannel(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await commerceService.createChannel(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('mappings/variant')
  async mapVariant(@Req() request:AuthenticatedRequest,@Body() input:any){try{return{data:await commerceService.mapVariant(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('orders/:id/partners')
  async mapOrderPartners(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await commerceService.mapOrderPartners(requireAuth(request),id,input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('fulfillments/:id/shipment')
  async mapFulfillmentShipment(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await commerceService.mapFulfillmentShipment(requireAuth(request),id,input.shipmentId??null)};}catch(error){return throwHttpDomainError(error);}}
  @Post('exceptions/:id/resolve')
  async resolveException(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){try{return{data:await commerceService.resolveException(requireAuth(request),id,input)};}catch(error){return throwHttpDomainError(error);}}
}
