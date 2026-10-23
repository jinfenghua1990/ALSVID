import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { integrationService } from './runtime.js';

@Controller('v1/integrations')
export class IntegrationsController{
  @Get()
  async summary(@Req() request:AuthenticatedRequest){try{return{data:await integrationService.summary(requireAuth(request))};}catch(error){return throwHttpDomainError(error);}}
  @Post('shopify/:channelId/ingest')
  async ingestShopify(@Req() request:AuthenticatedRequest,@Param('channelId') channelId:string,@Body() input:any){try{return{data:await integrationService.ingestShopify(requireAuth(request),channelId,input)};}catch(error){return throwHttpDomainError(error);}}
  @Post('shopify/receipts/:id/replay')
  async replayShopify(@Req() request:AuthenticatedRequest,@Param('id') id:string){try{return{data:await integrationService.replayShopify(requireAuth(request),id)};}catch(error){return throwHttpDomainError(error);}}
  @Post('channels/:channelId/cursors')
  async cursor(@Req() request:AuthenticatedRequest,@Param('channelId') channelId:string,@Body() input:any){try{return{data:await integrationService.setCursor(requireAuth(request),channelId,input)};}catch(error){return throwHttpDomainError(error);}}

  @Get('warehouse-providers')
  async warehouseProviderSummary(@Req() request:AuthenticatedRequest){try{return{data:await integrationService.warehouseProviderSummary(requireAuth(request))};}catch(error){return throwHttpDomainError(error);}}
  @Post('warehouse-providers')
  async createWarehouseProvider(@Req() request:AuthenticatedRequest,@Body() input:{providerCode:string;displayName:string;accountRef:string;credentialsSecretRef?:string}){try{return{data:await integrationService.createWarehouseProviderConnection(requireAuth(request),input)};}catch(error){return throwHttpDomainError(error);}}
}
