import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { productService } from './runtime.js';

@Controller('v1/product')
export class ProductController {
  @Get('catalog')
  async catalog(@Req() request: AuthenticatedRequest) {
    try { return { data: await productService.catalog(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('models')
  async createModel(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await productService.createModel(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('variants')
  async createVariant(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await productService.createVariant(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('skus')
  async createSku(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await productService.createSku(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Patch(':entity/:id')
  async update(@Req() request: AuthenticatedRequest, @Param('entity') entity: string, @Param('id') id: string, @Body() input: any) {
    if (!['model','variant','sku'].includes(entity)) throwHttpDomainError(new Error('Unsupported product entity'));
    try { return { data: await productService.updateEntity(requireAuth(request), entity as 'model' | 'variant' | 'sku', id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
