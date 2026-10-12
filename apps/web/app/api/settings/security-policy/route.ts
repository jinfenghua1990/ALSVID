import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

async function sessionToken(): Promise<string | null> {
  return (await cookies()).get('alsvid_session')?.value ?? null;
}

export async function GET(): Promise<NextResponse> {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ message: '登录状态已失效，请重新登录。' }, { status: 401 });
  const response = await fetch(`${apiBase}/v1/auth/security-policy`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ message: 'Security policy service unavailable' }));
  return NextResponse.json(payload, { status: response.status });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const token = await sessionToken();
  if (!token) return NextResponse.json({ message: '登录状态已失效，请重新登录。' }, { status: 401 });
  const response = await fetch(`${apiBase}/v1/auth/security-policy`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ message: 'Security policy service unavailable' }));
  return NextResponse.json(payload, { status: response.status });
}
