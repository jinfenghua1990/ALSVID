import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { CreatePartnerInput, UpdatePartnerInput } from '@alsvid/partners';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { partnerService } from './runtime.js';

@Controller('v1/partners')
export class PartnersController {
  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query('q') query?: string) {
    return { data: await partnerService.list(requireAuth(request), query ?? '') };
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return { data: await partnerService.get(requireAuth(request), id) };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreatePartnerInput) {
    return { data: await partnerService.create(requireAuth(request), input) };
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: UpdatePartnerInput) {
    return { data: await partnerService.update(requireAuth(request), id, input) };
  }
}
