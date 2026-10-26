import {Body,Controller,Delete,Get,Header,Headers,Param,Post,Req} from '@nestjs/common';
import type {AuthenticatedRequest} from './auth.guard.js';
import {requireAuth} from './auth.guard.js';
import {Public} from './public.decorator.js';
import {comparisonMediaService} from './runtime.js';
@Controller('v1/commerce-lab')
export class CommerceLabMediaController{
  @Post('products/:id/image')
  upload(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() body:unknown,
    @Headers('content-type') contentType:string,@Headers('x-upload-filename') name:string,
    @Headers('x-product-version') version:string){
    return comparisonMediaService.upload(requireAuth(request),id,Number(version),body,contentType??'',name??'').then(data=>({data}));
  }
  @Delete('products/:id/image')
  remove(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Headers('x-product-version') version:string){
    return comparisonMediaService.remove(requireAuth(request),id,Number(version)).then(data=>({data}));
  }
  @Get('products/:id/image') @Header('Cache-Control','private, no-store')
  read(@Req() request:AuthenticatedRequest,@Param('id') id:string){
    return comparisonMediaService.read(id,requireAuth(request)).then(url=>({data:{url}}));
  }
  @Public() @Get('public/products/:id/image') @Header('Cache-Control','no-store')
  publicImage(@Param('id') id:string){
    return comparisonMediaService.read(id).then(url=>({data:{url}}));
  }
}
