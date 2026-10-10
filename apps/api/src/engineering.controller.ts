import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requireAuth } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { engineeringService } from './runtime.js';

@Controller('v1/engineering')
export class EngineeringController {
  @Get()
  async summary(@Req() request: AuthenticatedRequest) {
    try { return { data: await engineeringService.summary(requireAuth(request)) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('parts')
  async createPart(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await engineeringService.createPart(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('boms')
  async createBom(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await engineeringService.createBom(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('bom-revisions/:id/lines')
  async addLine(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: any) {
    try { return { data: await engineeringService.addBomLine(requireAuth(request), id, input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('bom-revisions/:id/release')
  async releaseRevision(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await engineeringService.releaseBomRevision(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('build-specs')
  async createBuildSpec(@Req() request: AuthenticatedRequest, @Body() input: any) {
    try { return { data: await engineeringService.createBuildSpec(requireAuth(request), input) }; }
    catch (error) { return throwHttpDomainError(error); }
  }

  @Post('build-specs/:id/release')
  async releaseBuildSpec(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try { return { data: await engineeringService.releaseBuildSpec(requireAuth(request), id) }; }
    catch (error) { return throwHttpDomainError(error); }
  }
}
