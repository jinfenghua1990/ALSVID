import { NextResponse } from 'next/server';
import { backendFetch } from '../_lib/backend';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? '';
  const response = await backendFetch(`/v1/partners?q=${encodeURIComponent(query)}`);
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const response = await backendFetch('/v1/partners', { method: 'POST', body: await request.text() });
  return NextResponse.json(await response.json(), { status: response.status });
}
