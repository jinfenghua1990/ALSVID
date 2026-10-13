import { NextRequest, NextResponse } from 'next/server';
import { portalPathForHost } from './portal-routing';

export function proxy(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const portalPath = portalPathForHost(host);

  if (portalPath && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = portalPath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
