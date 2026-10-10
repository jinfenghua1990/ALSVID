import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { assetService } from './runtime.js';

@Controller('v1/assets')
export class AssetsController {
  @Post()
  async register(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await assetService.register(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post(':id/links')
  async link(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await assetService.link(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Get()
  async forEntity(@Req() request: AuthenticatedRequest, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    if (!entityType || !entityId) return throwHttpDomainError(new Error('entityType and entityId are required'));
    try { return { data: await assetService.forEntity(requireAuth(request), entityType, entityId) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
