import { NextResponse, type NextRequest } from 'next/server';

const authBaseUrl = process.env.AUTH_BASE_URL;

export function proxy(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();
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
