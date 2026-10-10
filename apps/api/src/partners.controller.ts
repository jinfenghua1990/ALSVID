import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { CreatePartnerInput, UpdatePartnerInput } from '@alsvid/partners';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { throwHttpDomainError } from './domain-errors.js';
import { partnerService } from './runtime.js';

@Controller('v1/partners')
export class PartnersController {
  @Get()
  async list(@Req() request: AuthenticatedRequest, @Query('q') query?: string) {
    try {
      return { data: await partnerService.list(requireAuth(request), query ?? '') };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    try {
      return { data: await partnerService.get(requireAuth(request), id) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreatePartnerInput) {
    try {
      return { data: await partnerService.create(requireAuth(request), input) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: UpdatePartnerInput) {
    try {
      return { data: await partnerService.update(requireAuth(request), id, input) };
    } catch (error) {
      return throwHttpDomainError(error);
    }
  }
}
