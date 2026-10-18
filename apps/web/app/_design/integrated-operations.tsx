import ProductClient from '../product/product-client';
import CommerceClient from '../commerce/commerce-client';
import ProductionClient from '../production/production-client';
import InventoryClient from '../inventory/inventory-client';
import DealersClient from '../dealers/dealers-client';
import SupplyClient from '../supply/supply-client';
import { CustomerRecords, AccessAuditRecords } from './admin-records';

export const integratedAreas = ['产品', '订单', '生产', '库存', '经销商', '供应链', '客户', '设置'] as const;

export function hasIntegratedOperations(area: string): boolean {
  return integratedAreas.some((name) => name === area);
}

/**
 * Render existing business components directly inside the Admin navigation,
 * without nesting a second legacy AppShell. This keeps the existing API writes
 * and avoids duplicate domain logic or fixture-powered "success" screens.
 */
export function IntegratedOperations({ area }: { area: string }) {
  switch (area) {
    case '产品': return <ProductClient embedded />;
    case '订单': return <CommerceClient embedded />;
    case '生产': return <ProductionClient embedded />;
    case '库存': return <InventoryClient embedded />;
    case '经销商': return <DealersClient embedded />;
    case '供应链': return <SupplyClient embedded />;
    case '客户': return <CustomerRecords />;
    case '设置': return <AccessAuditRecords />;
    default: return null;
  }
}
