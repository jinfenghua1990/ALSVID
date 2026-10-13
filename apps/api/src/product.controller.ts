import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { ProductStatus } from '@alsvid/product';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { productService } from './runtime.js';

interface CreateModelBody { platformId: string; code: string; name: string; description?: string }
interface CreateVariantBody { modelId: string; code: string; name: string; description?: string; attributes?: Record<string, unknown> }
interface CreateSkuBody { variantId: string; sku: string; name: string; marketCode?: string; colorCode?: string; sizeCode?: string; attributes?: Record<string, unknown> }
interface UpdateEntityBody { expectedVersion: number; name?: string; description?: string; status?: ProductStatus; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null }

@Controller('v1/product')
export class ProductController {
  @Get('catalog')
  async catalog(@Req() request: AuthenticatedRequest) {
    try { return { data: await productService.catalog(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('models')
  async createModel(@Req() request: AuthenticatedRequest, @Body() input: CreateModelBody) {
    try { return { data: await productService.createModel(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('variants')
  async createVariant(@Req() request: AuthenticatedRequest, @Body() input: CreateVariantBody) {
    try { return { data: await productService.createVariant(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('skus')
  async createSku(@Req() request: AuthenticatedRequest, @Body() input: CreateSkuBody) {
    try { return { data: await productService.createSku(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Patch(':entity/:id')
  async update(@Req() request: AuthenticatedRequest, @Param('entity') entity: string, @Param('id') id: string, @Body() input: UpdateEntityBody) {
    if (!['model','variant','sku'].includes(entity)) throwHttpDomainError(new Error('Unsupported product entity'));
    try { return { data: await productService.updateEntity(requireAuth(request), entity as 'model' | 'variant' | 'sku', id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
