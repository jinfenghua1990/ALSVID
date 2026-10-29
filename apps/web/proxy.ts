import { NextResponse, type NextRequest } from 'next/server';

import { isLocale } from './app/_lib/i18n/routing';
import { canonicalWwwHost, effectiveHostname, shouldRedirectToCanonicalWww } from './app/_lib/seo-host';

const authBaseUrl = process.env.AUTH_BASE_URL;

export function proxy(request: NextRequest) {
  const host = effectiveHostname(request.headers, request.nextUrl.hostname);
  const path = request.nextUrl.pathname;
  // Always converge the bare domain on the crawlable WWW origin.
  // Preserve the requested path/query and leave Admin/Dealer/My hosts untouched.
  if (shouldRedirectToCanonicalWww(host)) {
    const canonical = new URL(`https://${canonicalWwwHost}`);
    canonical.pathname = path;
    canonical.search = request.nextUrl.search;
    return NextResponse.redirect(canonical, 308);
  }
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
  requestHeaders.set('x-alsvid-return-to', `${path}${request.nextUrl.search}`);
  const locale = path.split('/')[1];
  if (isLocale(locale)) requestHeaders.set('x-alsvid-locale', locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
