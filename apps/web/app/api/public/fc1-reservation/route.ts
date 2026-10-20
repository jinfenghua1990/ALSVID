import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const apiBase = process.env.ALSVID_API_BASE_URL;
  if (!apiBase) return NextResponse.json({ error: 'Reservation service is unavailable' }, { status: 503 });
  const response = await fetch(`${apiBase}/v1/public/fc1-reservations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const payload = await response.json().catch(() => ({ error: 'Reservation service is unavailable' }));
  return NextResponse.json(payload, { status: response.status });
}
