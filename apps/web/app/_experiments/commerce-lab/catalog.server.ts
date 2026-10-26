import 'server-only';
import { readCrmebCatalog, type CatalogSnapshot } from './crmeb-catalog';

export async function getLabCatalog(audience: 'admin' | 'public'): Promise<CatalogSnapshot> {
  // Public publication is a separate, explicit operator choice.
  const enabled = audience === 'admin' || process.env.CRMEB_LAB_PUBLIC_CATALOG === 'enabled';
  const origin = enabled ? process.env.CRMEB_LAB_ORIGIN : undefined;
  return readCrmebCatalog(origin ? { CRMEB_LAB_ORIGIN: origin } : {});
}
