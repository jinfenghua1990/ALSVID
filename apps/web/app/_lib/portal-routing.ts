export type PortalId = 'www' | 'admin' | 'dealer' | 'supplier' | 'my';
export type ProtectedPortalId = Exclude<PortalId, 'www'>;

export const portalDefinitions: Record<PortalId, { label: string; homePath: string; hostnamePrefix: string }> = {
  www: { label: 'ALSVID 官网', homePath: '/', hostnamePrefix: 'www' },
  admin: { label: 'ALSVID Admin', homePath: '/admin', hostnamePrefix: 'admin' },
  dealer: { label: 'Dealer Portal', homePath: '/dealer', hostnamePrefix: 'dealer' },
  supplier: { label: 'Supplier Portal', homePath: '/supplier', hostnamePrefix: 'supplier' },
  my: { label: 'My ALSVID', homePath: '/my', hostnamePrefix: 'my' },
};

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().split(':')[0] ?? '';
}

export function portalFromHost(host: string): PortalId {
  const value = normalizeHost(host);
  const firstLabel = value.split('.')[0] ?? '';
  if (firstLabel === 'www') return 'www';
  if (firstLabel === 'admin') return 'admin';
  if (firstLabel === 'dealer') return 'dealer';
  if (firstLabel === 'supplier') return 'supplier';
  if (firstLabel === 'my') return 'my';
  // The temporary Cloud Run hostname is still the internal Admin preview.
  return 'admin';
}

export function portalHostFor(host: string, portal: PortalId): string {
  const value = normalizeHost(host);
  const isDev = value.includes('.dev.chaibenn.com') || value.includes('.dev.alsvid.com');
  const domain = isDev ? 'dev.chaibenn.com' : value.endsWith('.alsvid.com') || value === 'alsvid.com' ? 'alsvid.com' : 'chaibenn.com';
  return `${portalDefinitions[portal].hostnamePrefix}.${domain}`;
}

export function portalUrlFor(host: string, portal: PortalId): string {
  return `https://${portalHostFor(host, portal)}`;
}
