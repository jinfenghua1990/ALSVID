import { NextResponse } from 'next/server';
import { backendFetch } from '../../_lib/backend';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetPath = `/${path.map(encodeURIComponent).join('/')}${sourceUrl.search}`;
  const method = request.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.text();
  const response = await backendFetch(targetPath, { method, body });
  const text = await response.text();
  return new NextResponse(text, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' } });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
