import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { commerceService } from './runtime.js';

@Controller('v1/commerce')
export class CommerceController{
  @Get()
  async summary(@Req() request:AuthenticatedRequest){return{data:await commerceService.summary(requireAuth(request))};}
  @Post('channels')
  async createChannel(@Req() request:AuthenticatedRequest,@Body() input:any){return{data:await commerceService.createChannel(requireAuth(request),input)};}
  @Post('mappings/variant')
  async mapVariant(@Req() request:AuthenticatedRequest,@Body() input:any){return{data:await commerceService.mapVariant(requireAuth(request),input)};}
  @Post('orders/:id/partners')
  async mapOrderPartners(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){return{data:await commerceService.mapOrderPartners(requireAuth(request),id,input)};}
  @Post('fulfillments/:id/shipment')
  async mapFulfillmentShipment(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){return{data:await commerceService.mapFulfillmentShipment(requireAuth(request),id,input.shipmentId??null)};}
  @Post('exceptions/:id/resolve')
  async resolveException(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:any){return{data:await commerceService.resolveException(requireAuth(request),id,input)};}
}
