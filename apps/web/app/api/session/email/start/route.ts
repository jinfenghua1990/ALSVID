import { NextResponse } from 'next/server';

const apiBase = process.env.ALSVID_API_BASE_URL ?? '';

export async function POST(request: Request): Promise<NextResponse> {
  const response = await fetch(`${apiBase}/v1/auth/email/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({ message: 'Verification service unavailable' }));
  return NextResponse.json(payload, { status: response.status });
}
