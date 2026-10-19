import { NextResponse } from 'next/server';
import { backendFetch } from '../../_lib/backend';

/** Forward a small first-party preference event to the persistent ALSVID API. */
export async function POST(request: Request): Promise<NextResponse> {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return NextResponse.json({ error: 'Cross-origin submission rejected' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
    }
  }
  const body = await request.text();
  if (body.length > 700) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  try {
    const response = await backendFetch('/v1/colour-interest', { method: 'POST', body });
    if (!response.ok) return NextResponse.json({ saved: false }, { status: response.status });
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ saved: false }, { status: 503 });
  }
}
