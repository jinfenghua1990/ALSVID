export function sessionCookieOptions(request: Request, expiresAt?: Date): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  domain?: string;
  expires?: Date;
} {
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const domain = host.endsWith('.dev.alsvid.com')
    ? '.dev.alsvid.com'
    : host.endsWith('.alsvid.com') && host !== 'alsvid.com'
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
