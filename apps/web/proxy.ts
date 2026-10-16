import { NextResponse, type NextRequest } from 'next/server';

const authBaseUrl = process.env.AUTH_BASE_URL;

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const requestHost = forwardedHost ?? request.headers.get('host') ?? request.nextUrl.hostname;
  const host = requestHost.split(',')[0].trim().split(':')[0].toLowerCase();
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

  return NextResponse.next();
}
