import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { SupplierAcknowledgement } from '@alsvid/procurement';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { supplierPortalService } from './runtime.js';

@Controller('v1/supplier')
export class SupplierPortalController {
 @Get('purchase-orders')
 async list(@Req() req:AuthenticatedRequest){
  return {data:await supplierPortalService.list(requireAuth(req))};
 }
 @Get('purchase-orders/:id')
 async detail(@Req() req:AuthenticatedRequest,@Param('id') id:string){
  return {data:await supplierPortalService.detail(requireAuth(req),id)};
 }
 @Post('purchase-orders/:id/acknowledge')
 async acknowledge(@Req() req:AuthenticatedRequest,@Param('id') id:string,@Body() body:SupplierAcknowledgement){
  return {data:await supplierPortalService.acknowledge(requireAuth(req),id,body)};
 }
}
