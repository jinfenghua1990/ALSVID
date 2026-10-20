import {Body,Controller,Get,Param,Post,Req} from '@nestjs/common';
import type {CreateStorefrontOrderInput,CreateStorefrontPriceInput} from '@alsvid/commerce';
import type {AuthenticatedRequest} from './auth.guard.js';
import {requireAuth} from './auth.guard.js';
import {throwHttpDomainError} from './domain-errors.js';
import {storefrontOrderService} from './runtime.js';

interface ExpectedVersionBody{expectedVersion:number}
interface CancelDraftBody extends ExpectedVersionBody{reason:string}

/** Internal draft/price-book operations only. No public checkout or payment endpoint is exposed. */
@Controller('v1/commerce/storefront')
export class StorefrontOrdersController{
 @Get('summary')
 async summary(@Req() request:AuthenticatedRequest){
  try{return{data:await storefrontOrderService.summary(requireAuth(request))};}
  catch(error){return throwHttpDomainError(error);}
 }
 @Post('prices')
 async createPrice(@Req() request:AuthenticatedRequest,@Body() input:CreateStorefrontPriceInput){
  try{return{data:await storefrontOrderService.createPrice(requireAuth(request),input)};}
  catch(error){return throwHttpDomainError(error);}
 }
 @Post('prices/:id/activate')
 async activatePrice(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:ExpectedVersionBody){
  try{return{data:await storefrontOrderService.activatePrice(requireAuth(request),id,Number(input.expectedVersion))};}
  catch(error){return throwHttpDomainError(error);}
 }
 @Post('prices/:id/retire')
 async retirePrice(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:ExpectedVersionBody){
  try{return{data:await storefrontOrderService.retirePrice(requireAuth(request),id,Number(input.expectedVersion))};}
  catch(error){return throwHttpDomainError(error);}
 }
 @Post('orders')
 async createDraftOrder(@Req() request:AuthenticatedRequest,@Body() input:CreateStorefrontOrderInput){
  try{return{data:await storefrontOrderService.createDraftOrder(requireAuth(request),input)};}
  catch(error){return throwHttpDomainError(error);}
 }
 @Post('orders/:id/cancel')
 async cancelDraftOrder(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:CancelDraftBody){
  try{return{data:await storefrontOrderService.cancelDraftOrder(requireAuth(request),id,Number(input.expectedVersion),input.reason)};}
  catch(error){return throwHttpDomainError(error);}
 }
}
