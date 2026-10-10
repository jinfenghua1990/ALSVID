import { NextResponse } from 'next/server';
import { backendFetch } from '../../_lib/backend';

export async function POST(): Promise<NextResponse> {
  await backendFetch('/v1/auth/logout', { method: 'POST' });
  const result = NextResponse.json({ data: { ok: true } });
  result.cookies.set('alsvid_session', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return result;
}
