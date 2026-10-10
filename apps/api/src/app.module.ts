import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AssetsController } from './assets.controller.js';
import { AuditController } from './audit.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { CommerceController } from './commerce.controller.js';
import { DealerController } from './dealer.controller.js';
import { EngineeringController } from './engineering.controller.js';
import { FinanceController } from './finance.controller.js';
import { HealthController } from './health.controller.js';
import { IntegrationsController } from './integrations.controller.js';
import { InventoryController } from './inventory.controller.js';
import { LogisticsController } from './logistics.controller.js';
import { PartnersController } from './partners.controller.js';
import { ProcurementController } from './procurement.controller.js';
import { ProductController } from './product.controller.js';
import { ProductionController } from './production.controller.js';
import { VehicleController } from './vehicle.controller.js';
import { WarehouseController } from './warehouse.controller.js';
import { DomainExceptionFilter } from './platform/domain-exception.filter.js';
import { RequestContextInterceptor } from './platform/request-context.interceptor.js';

@Module({
  controllers: [
    HealthController,
    AuthController,
    PartnersController,
    AuditController,
    ProductController,
    EngineeringController,
    AssetsController,
    ProcurementController,
    ProductionController,
    VehicleController,
    InventoryController,
    WarehouseController,
    LogisticsController,
    DealerController,
    CommerceController,
    IntegrationsController,
    FinanceController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
