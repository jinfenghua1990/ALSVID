import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { Public } from './public.decorator.js';
import { comparisonCatalogService } from './runtime.js';
@Controller('v1/commerce-lab')
export class CommerceLabController {
  @Public() @Get('public/products')
  publicList(@Query() query:{page?:string;limit?:string;query?:string}) {
    return comparisonCatalogService.publicList(query).then(data=>({data}));
  }
  @Public() @Get('public/products/:id')
  publicProduct(@Param('id') id:string) {return comparisonCatalogService.publicProduct(id).then(data=>({data}));}
  @Get('products')
  list(@Req() request:AuthenticatedRequest,@Query() query:{page?:string;limit?:string;query?:string}) {
    return comparisonCatalogService.adminList(requireAuth(request),query).then(data=>({data}));
  }
  @Get('products/:id')
  product(@Req() request:AuthenticatedRequest,@Param('id') id:string) {
    return comparisonCatalogService.adminProduct(requireAuth(request),id).then(data=>({data}));
  }
  @Post('products')
  create(@Req() request:AuthenticatedRequest,@Body() value:unknown) {
    return comparisonCatalogService.create(requireAuth(request),value).then(data=>({data}));
  }
  @Patch('products/:id')
  update(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() value:unknown) {
    return comparisonCatalogService.update(requireAuth(request),id,value).then(data=>({data}));
  }
}
