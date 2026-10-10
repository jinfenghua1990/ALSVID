import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditController } from './audit.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { HealthController } from './health.controller.js';
import { PartnersController } from './partners.controller.js';

@Module({
  controllers: [HealthController, AuthController, PartnersController, AuditController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
