import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { HomepageBindingMode, HomepageSlotCode, PublicationAction, ProductStatus, ProductTypeCode } from '@alsvid/product';
import { Public } from './public.decorator.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { productService } from './runtime.js';

interface CreatePlatformBody { code: string; name: string; description?: string }
interface UpdatePlatformBody { expectedVersion: number; name?: string; description?: string; status?: ProductStatus }
interface CreateModelFieldBody {
  productTypeCode: ProductTypeCode; code:string; label:string;
  fieldType:'TEXT'|'NUMBER'|'BOOLEAN'|'SELECT'; options?:string[]; required?:boolean;
}
interface UpdateModelFieldBody { expectedVersion:number; label?:string; status?:'ACTIVE'|'RETIRED'; required?:boolean }
interface CreateModelBody { platformId?: string | null; productTypeCode?: ProductTypeCode; code: string; name: string; description?: string; customFields?: Record<string,unknown> }
interface UpdateHomepageBindingBody { slot: HomepageSlotCode; mode: HomepageBindingMode; modelId?: string | null; expectedVersion: number }
interface CreateVariantBody { modelId: string; code: string; name: string; description?: string; attributes?: Record<string, unknown> }
interface CreateSkuBody { variantId: string; sku: string; name: string; marketCode?: string; colorCode?: string; sizeCode?: string; attributes?: Record<string, unknown> }
interface PublicationDraftBody { expectedVersion: number; titleZh: string; titleDe: string; titleEn: string; evidenceNote: string }
interface PublicationActionBody { action: PublicationAction; expectedVersion: number }
interface UpdateEntityBody { expectedVersion: number; name?: string; description?: string; status?: ProductStatus; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null; customFields?:Record<string,unknown> }

@Controller('v1/product')
export class ProductController {
  @Public()
  @Get('public/homepage-bindings')
  async publicHomepageBindings() {
    try { return { data: await productService.publicHomepageBindings() }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Get('homepage-bindings')
  async homepageBindings(@Req() request: AuthenticatedRequest) {
    try { return { data: await productService.homepageBindings(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('homepage-bindings')
  async setHomepageBinding(@Req() request: AuthenticatedRequest, @Body() input: UpdateHomepageBindingBody) {
    try { return { data: await productService.setHomepageBinding(requireAuth(request),input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Public()
  @Get('public/catalog')
  async publishedCatalog() {
    try { return {data:await productService.publishedCatalog()}; }
    catch(error) { return throwHttpDomainError(error); }
  }

  @Get('publications')
  async publications(@Req() request:AuthenticatedRequest) {
    try { return {data:await productService.publications(requireAuth(request))}; }
    catch(error) { return throwHttpDomainError(error); }
  }

  @Get('catalog-publish-assets')
  async catalogPublishAssets(@Req() request:AuthenticatedRequest) {
    try { return {data:await productService.catalogPublishAssets(requireAuth(request))}; }
    catch(error) { return throwHttpDomainError(error); }
  }

  @Post('publications/:modelId/start')
  async startPublication(@Req() request:AuthenticatedRequest,@Param('modelId') modelId:string) {
    try { return {data:await productService.startPublication(requireAuth(request),modelId)}; }
    catch(error) { return throwHttpDomainError(error); }
  }

  @Patch('publications/:modelId/draft')
  async savePublicationDraft(@Req() request:AuthenticatedRequest,@Param('modelId') modelId:string,
    @Body() input:PublicationDraftBody) {
    try { return {data:await productService.savePublicationDraft(requireAuth(request),modelId,input)}; }
    catch(error) { return throwHttpDomainError(error); }
  }

  @Post('publications/:modelId/transition')
  async transitionPublication(@Req() request:AuthenticatedRequest,@Param('modelId') modelId:string,
    @Body() input:PublicationActionBody) {
    try { return {data:await productService.transitionPublication(requireAuth(request),modelId,input)}; }
    catch(error) { return throwHttpDomainError(error); }
  }

  @Get('catalog')
  async catalog(@Req() request: AuthenticatedRequest) {
    try { return { data: await productService.catalog(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('model-fields')
  async createModelField(@Req() request:AuthenticatedRequest,@Body() input:CreateModelFieldBody) {
    try{return {data:await productService.createModelField(requireAuth(request),input)};}
    catch(error){return throwHttpDomainError(error);}
  }

  @Patch('model-fields/:id')
  async updateModelField(@Req() request:AuthenticatedRequest,@Param('id') id:string,@Body() input:UpdateModelFieldBody) {
    try{return {data:await productService.updateModelField(requireAuth(request),id,input)};}
    catch(error){return throwHttpDomainError(error);}
  }

  @Post('platforms')
  async createPlatform(@Req() request: AuthenticatedRequest, @Body() input: CreatePlatformBody) {
    try { return { data: await productService.createPlatform(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Patch('platforms/:id')
  async updatePlatform(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: UpdatePlatformBody) {
    try { return { data: await productService.updatePlatform(requireAuth(request), id, input) }; }
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
