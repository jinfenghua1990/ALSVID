import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { RegisterAssetInput } from '@alsvid/assets';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { assetService } from './runtime.js';

interface AssetLinkBody { entityType: string; entityId: string; purpose?: string; sortOrder?: number }

@Controller('v1/assets')
export class AssetsController {
  @Post()
  async register(@Req() request: AuthenticatedRequest, @Body() input: RegisterAssetInput) {
    return { data: await assetService.register(requireAuth(request), input) };
  }

  @Post(':id/links')
  async link(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: AssetLinkBody) {
    return { data: await assetService.link(requireAuth(request), id, input) };
  }

  @Get()
  async forEntity(@Req() request: AuthenticatedRequest, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    if (!entityType || !entityId) throw new BadRequestException('entityType and entityId are required');
    return { data: await assetService.forEntity(requireAuth(request), entityType, entityId) };
  }
}
