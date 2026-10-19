/**
 * Stable internal Admin deep links. IDs are identifiers from authorized API facts,
 * never customer ownership evidence or an instruction to write to a different domain.
 * The destination domain still checks its own read/write permissions.
 */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function recordId(value: string | null | undefined): string | null {
  return value && uuid.test(value) ? value : null;
}

export function adminRecordHref(
  domain: 'vehicle' | 'service' | 'service-intake' | 'order' | 'customer',
  id: string,
): string {
  if (!recordId(id)) throw new Error('Valid business record ID required');
  const routes = {
    vehicle: ['/admin/production/vin-detail', 'vehicleId'],
    service: ['/admin/after-sales', 'caseId'],
    'service-intake': ['/admin/after-sales', 'vehicleId'],
    order: ['/admin/orders', 'orderId'],
    customer: ['/admin/customers', 'partnerId'],
  } as const;
  const [path, key] = routes[domain];
  return path + '?' + key + '=' + encodeURIComponent(id);
}

export function queryRecordId(key: 'vehicleId' | 'caseId' | 'orderId' | 'partnerId'): string | null {
  if (typeof window === 'undefined') return null;
  return recordId(new URLSearchParams(window.location.search).get(key));
}
