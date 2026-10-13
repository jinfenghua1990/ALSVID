import { NextResponse } from 'next/server';
import { sessionCookieOptions } from '../../../_lib/session-cookie';

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
  result.cookies.set('alsvid_session', payload.data.token, sessionCookieOptions(request, new Date(payload.data.expiresAt)));
  return result;
}
