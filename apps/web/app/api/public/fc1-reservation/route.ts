import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json({ error: 'Cross-origin submission rejected' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
    }
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 2048) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const rawBody = await request.text().catch(() => '');
  if (rawBody.length > 2048) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const apiBase = process.env.ALSVID_API_BASE_URL;
  if (!apiBase) return NextResponse.json({ error: 'Reservation service is unavailable' }, { status: 503 });
  try {
    const response = await fetch(`${apiBase}/v1/public/fc1-reservations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({ error: 'Reservation service is unavailable' }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Reservation service is unavailable' }, { status: 503 });
  }
}
