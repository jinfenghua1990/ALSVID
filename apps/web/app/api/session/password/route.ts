import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function POST(request: Request): Promise<NextResponse> {
  const token = (await cookies()).get('alsvid_session')?.value;
  if (!token) return NextResponse.json({ message: '登录状态已失效，请重新登录。' }, { status: 401 });

  const response = await fetch(`${apiBase}/v1/auth/password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ message: 'Password service unavailable' }));
  return NextResponse.json(payload, { status: response.status });
}
