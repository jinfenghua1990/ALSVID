const portalPathsByHost: Record<string, string> = {
  'www.chaibenn.com': '/admin',
  'admin.chaibenn.com': '/admin',
  'dealer.chaibenn.com': '/dealer',
  'my.chaibenn.com': '/my',
};

export function portalPathForHost(host: string | null): string | null {
  const hostname = (host ?? '').split(',')[0].trim().split(':')[0].toLowerCase();
  return portalPathsByHost[hostname] ?? null;
}
