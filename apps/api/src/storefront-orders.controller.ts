import {BadRequestException,Body,Controller,Get,Param,Post,Query,Req} from '@nestjs/common';
import type {CreateStorefrontOrderInput,CreateStorefrontPriceInput,StorefrontOrderQuery} from '@alsvid/commerce';
import type {AuthenticatedRequest} from './auth.guard.js';
import {requireAuth} from './auth.guard.js';
import {storefrontOrderService,storefrontReadinessService} from './runtime.js';

interface ExpectedVersionBody{expectedVersion:number}
interface CancelDraftBody extends ExpectedVersionBody{reason:string}

/** Internal draft, submission and price-book operations only. Submitting an order records customer intent; it does not start a payment attempt. No public checkout or payment endpoint is exposed. */
@Controller('v1/commerce/storefront')
export class StorefrontOrdersController{
 @Get('readiness')
 async readiness(@Req() request:AuthenticatedRequest,
  @Query('marketCountry') marketCountry?:string,@Query('query') query?:string){
  if(marketCountry!=='DE'&&marketCountry!=='AT')
   throw new BadRequestException('marketCountry must be DE or AT');
  return{data:await storefrontReadinessService.summary(requireAuth(request),marketCountry,query??'');}
 }
 @Get('summary')
 async summary(@Req() request:AuthenticatedRequest,@Query() query:StorefrontOrderQuery){
  return{data:await storefrontOrderService.summary(requireAuth(request),query??{});}
 }
 @Post('prices')
 async createPrice(@Req() request:AuthenticatedRequest,@Body() input:CreateStorefrontPriceInput){
  return{data:await storefrontOrderService.createPrice(requireAuth(request),input);}
 }
 @Post('prices/:id/activate')
 async activatePrice(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:ExpectedVersionBody){
  return{data:await storefrontOrderService.activatePrice(requireAuth(request),id,Number(input?.expectedVersion));}
 }
 @Post('prices/:id/retire')
 async retirePrice(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:ExpectedVersionBody){
  return{data:await storefrontOrderService.retirePrice(requireAuth(request),id,Number(input?.expectedVersion));}
 }
 @Post('orders')
 async createDraftOrder(@Req() request:AuthenticatedRequest,@Body() input:CreateStorefrontOrderInput){
  return{data:await storefrontOrderService.createDraftOrder(requireAuth(request),input);}
 }
 @Post('orders/:id/cancel')
 async cancelDraftOrder(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:CancelDraftBody){
  return{data:await storefrontOrderService.cancelDraftOrder(requireAuth(request),id,Number(input?.expectedVersion),input?.reason??'');}
 }
 @Get('orders/:id')
 async orderDetail(@Req() request:AuthenticatedRequest,@Param('id') id:string){
  return{data:await storefrontOrderService.loadOrderDetail(requireAuth(request),id);}
 }
 @Get('orders/:id/events')
 async orderEvents(@Req() request:AuthenticatedRequest,@Param('id') id:string){
  return{data:(await storefrontOrderService.loadOrderDetail(requireAuth(request),id)).events;}
 }
 @Post('orders/:id/submit')
 async submitDraftOrder(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:ExpectedVersionBody){
  return{data:await storefrontOrderService.submitOrder(requireAuth(request),id,Number(input?.expectedVersion));}
 }
}
