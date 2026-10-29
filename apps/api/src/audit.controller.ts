import { Controller, Get, Query, Req } from '@nestjs/common';
import { assertPermission, Permission } from '@alsvid/identity';
import { requireAuth, type AuthenticatedRequest } from './auth.guard.js';
import { auditService } from './runtime.js';

@Controller('v1/audit')
export class AuditController {
  @Get()
  async recent(@Req() request: AuthenticatedRequest, @Query('limit') limit?: string) {
    assertPermission(requireAuth(request), Permission.AuditRead);
    return { data: await auditService.recent(Number(limit ?? 100)) };
  }
}
