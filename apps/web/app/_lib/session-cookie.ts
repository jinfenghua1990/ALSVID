const INTERNAL_PORTALS = new Set(['admin', 'dealer', 'supplier', 'service']);

export function sessionCookieName(request: Request, portal?: string): 'alsvid_session' | 'alsvid_my_session' {
  const host = ((request.headers.get('host') ?? '').split(':')[0] ?? '').toLowerCase();
  return sessionCookieNameForHost(host, portal);
}

export function sessionCookieNameForHost(host: string, portal?: string): 'alsvid_session' | 'alsvid_my_session' {
  const normalizedHost = host.trim().toLowerCase().split(':')[0] ?? '';
  return portal === 'my' || normalizedHost.split('.')[0] === 'my' ? 'alsvid_my_session' : 'alsvid_session';
}

export function sessionCookieNameForPortal(portal: string): 'alsvid_session' | 'alsvid_my_session' {
  return portal === 'my' ? 'alsvid_my_session' : 'alsvid_session';
}

export function sessionCookieOptions(request: Request, expiresAt?: Date): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  domain?: string;
  expires?: Date;
} {
  const host = ((request.headers.get('host') ?? '').split(':')[0] ?? '').toLowerCase();
  const portal = host.split('.')[0] ?? '';
  const domain = INTERNAL_PORTALS.has(portal) && host.endsWith('.dev.chaibenn.com')
    ? '.dev.chaibenn.com'
    : INTERNAL_PORTALS.has(portal) && host.endsWith('.chaibenn.com')
      ? '.chaibenn.com'
      : INTERNAL_PORTALS.has(portal) && host.endsWith('.dev.alsvid.com')
        ? '.dev.alsvid.com'
        : INTERNAL_PORTALS.has(portal) && host.endsWith('.alsvid.com')
          ? '.alsvid.com'
          : undefined;

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.ALSVID_COOKIE_SECURE !== 'false',
    path: '/',
    ...(domain ? { domain } : {}),
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function expiredSessionCookieOptions(request: Request): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  domain?: string;
  maxAge: 0;
} {
  return {
    ...sessionCookieOptions(request),
    maxAge: 0,
  };
}
