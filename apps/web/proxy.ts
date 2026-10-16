import { NextResponse, type NextRequest } from 'next/server';

import { isLocale } from './app/_lib/i18n/routing';

const authBaseUrl = process.env.AUTH_BASE_URL;

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const requestHost = forwardedHost ?? request.headers.get('host') ?? request.nextUrl.hostname;
  const host = requestHost.split(',').at(0)?.trim().split(':').at(0)?.toLowerCase() ?? '';
  const path = request.nextUrl.pathname;
  if (
    process.env.NODE_ENV === 'production'
    && host.endsWith('.run.app')
    && authBaseUrl
    && path !== '/api'
    && !path.startsWith('/api/')
  ) {
    const canonical = new URL(authBaseUrl);
    canonical.pathname = path;
    canonical.search = request.nextUrl.search;
    canonical.hash = '';
    return NextResponse.redirect(canonical, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-alsvid-locale');
  const locale = path.split('/')[1];
  if (isLocale(locale)) requestHeaders.set('x-alsvid-locale', locale);
  if (path === '/home') requestHeaders.set('x-alsvid-locale', 'de');
  return NextResponse.next({ request: { headers: requestHeaders } });
}
