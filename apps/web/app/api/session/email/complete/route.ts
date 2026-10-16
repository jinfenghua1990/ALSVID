import { NextResponse } from 'next/server';
import { sessionCookieName, sessionCookieOptions } from '../../../../_lib/session-cookie';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const response = await fetch(`${apiBase}/v1/auth/email/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ message: 'Verification service unavailable' }));
  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  const result = NextResponse.json({
    data: {
      ...payload.data.user,
      firstAdminActivated: Boolean(payload.data.firstAdminActivated),
    },
  });
  let portal: string | undefined;
  try { portal = JSON.parse(body).portal; } catch { /* The API returns the validation error for malformed JSON. */ }
  result.cookies.set(sessionCookieName(request, portal), payload.data.token, sessionCookieOptions(request, new Date(payload.data.expiresAt)));
  return result;
}
