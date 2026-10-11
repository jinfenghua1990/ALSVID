import { NextResponse } from 'next/server';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function POST(request: Request): Promise<NextResponse> {
  const response = await fetch(`${apiBase}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  const result = NextResponse.json({ data: payload.data.user });
  result.cookies.set('alsvid_session', payload.data.token, {
    httpOnly: true,
    sameSite: 'lax',
    // NODE_ENV is inlined at build time as 'production'; use a runtime flag so
    // Development/Test over plain HTTP (e.g. LAN IP) can still store the cookie.
    secure: process.env.ALSVID_COOKIE_SECURE !== 'false',
    path: '/',
    expires: new Date(payload.data.expiresAt),
  });
  return result;
}
