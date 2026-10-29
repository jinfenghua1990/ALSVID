import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { engineeringService } from './runtime.js';

interface CreatePartBody { partNumber: string; name: string; category?: string; defaultUnit?: string; description?: string }
interface CreateBomBody { modelId: string; code: string; name: string; revisionCode?: string; description?: string }
interface AddBomLineBody { lineNo: number; partId: string; quantity: number; unit?: string; reference?: string }
interface CreateBuildSpecBody { code: string; skuId: string; bomRevisionId: string; notes?: string; attributes?: Record<string, unknown> }

@Controller('v1/engineering')
export class EngineeringController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    return { data: await engineeringService.summary(requireAuth(request)) };
  }

  @Post('parts')
  async createPart(@Req() request: AuthenticatedRequest, @Body() input: CreatePartBody) {
    return { data: await engineeringService.createPart(requireAuth(request), input) };
  }

  @Post('boms')
  async createBom(@Req() request: AuthenticatedRequest, @Body() input: CreateBomBody) {
    return { data: await engineeringService.createBom(requireAuth(request), input) };
  }

  @Post('bom-revisions/:id/lines')
  async addLine(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: AddBomLineBody) {
    return { data: await engineeringService.addBomLine(requireAuth(request), id, input) };
  }

  @Post('bom-revisions/:id/release')
  async releaseRevision(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await engineeringService.releaseBomRevision(requireAuth(request), id) };
  }

  @Post('build-specs')
  async createBuildSpec(@Req() request: AuthenticatedRequest, @Body() input: CreateBuildSpecBody) {
    return { data: await engineeringService.createBuildSpec(requireAuth(request), input) };
  }

  @Post('build-specs/:id/release')
  async releaseBuildSpec(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await engineeringService.releaseBuildSpec(requireAuth(request), id) };
  }
}
