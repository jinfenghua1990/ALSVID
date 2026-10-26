/**
 * Read-only experimental adapter. No ALSVID Product/Commerce writes.
 * Contract: crmeb/CRMEB crmeb/app/api/route/v1.php and StoreProductController::lst.
 * This is not a Medusa-compatible commerce engine.
 */
export type CatalogProduct = { id: string; title: string };
export type CatalogSnapshot = {
  state: 'not-configured' | 'configuration-error' | 'unavailable' | 'connected';
  checkedAt: string; products: CatalogProduct[];
};
type Env = { CRMEB_LAB_ORIGIN?: string };
type Fetcher = typeof fetch;
export async function readCrmebCatalog(env: Env, request: Fetcher = fetch): Promise<CatalogSnapshot> {
  const checkedAt = new Date().toISOString();
  const result = (state: CatalogSnapshot['state'], products: CatalogProduct[] = []): CatalogSnapshot =>
    ({ state, checkedAt, products });
  if (!env.CRMEB_LAB_ORIGIN) return result('not-configured');
  let origin: URL;
  try {
    origin = new URL(env.CRMEB_LAB_ORIGIN);
    if (origin.protocol !== 'https:' || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash || origin.port ||
        !origin.hostname.includes('.') || origin.hostname.endsWith('.') ||
        /^[\d.]+$/.test(origin.hostname) ||
        /(^|\.)(localhost|local|internal|test|invalid)$/.test(origin.hostname))
      return result('configuration-error');
  } catch { return result('configuration-error'); }
  // The address comes only from deployment configuration, never from a request.
  const url = new URL('/api/products', origin);
  url.searchParams.set('page', '1');
  url.searchParams.set('limit', '20');
  let response: Response | undefined;
  try {
    response = await request(url, {
      method: 'GET', headers: { Accept: 'application/json' },
      credentials: 'omit', redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/json'))
      return result('unavailable');
    if (!response.body) return result('unavailable');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 262144) { await reader.cancel(); return result('unavailable'); }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
    if (!payload || payload.status !== 200 || !Array.isArray(payload.data) || payload.data.length > 20)
      return result('unavailable');
    const products: CatalogProduct[] = [];
    const ids = new Set<string>();
    for (const row of payload.data) {
      if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 ||
          typeof row.store_name !== 'string' || !row.store_name.trim() || row.store_name.length > 200)
        return result('unavailable');
      const id = 'crmeb-' + row.id;
      if (ids.has(id)) return result('unavailable');
      ids.add(id);
      // Intentionally exclude prices, currencies, ratings, stock and upstream HTML/URLs.
      products.push({ id, title: row.store_name.trim() });
    }
    return result('connected', products);
  } catch { return result('unavailable'); }
  finally { if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {}); }
}
