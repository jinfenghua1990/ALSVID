import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionCookieName } from '../../../_lib/session-cookie';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  let portal: string | undefined;
  try { portal = JSON.parse(body).portal; } catch { return NextResponse.json({ message: 'Invalid request' }, { status: 400 }); }
  const token = (await cookies()).get(sessionCookieName(request, portal))?.value;
  if (!token) return NextResponse.json({ message: '登录状态已失效，请重新登录。' }, { status: 401 });

  const response = await fetch(`${apiBase}/v1/auth/password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ message: 'Password service unavailable' }));
  return NextResponse.json(payload, { status: response.status });
}
