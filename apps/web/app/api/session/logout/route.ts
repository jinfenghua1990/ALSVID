import { NextResponse } from 'next/server';
import { backendFetch } from '../../_lib/backend';
import { expiredSessionCookieOptions } from '../../../_lib/session-cookie';

async function clearSessionCookie(result: NextResponse, request: Request): Promise<NextResponse> {
  result.cookies.set('alsvid_session', '', expiredSessionCookieOptions(request));
  return result;
}

export async function POST(request: Request): Promise<NextResponse> {
  await backendFetch('/v1/auth/logout', { method: 'POST' });
  return clearSessionCookie(NextResponse.json({ data: { ok: true } }), request);
}

// 浏览器导航式退出：清掉 cookie 后回到门户首页。
export async function GET(request: Request): Promise<NextResponse> {
  await backendFetch('/v1/auth/logout', { method: 'POST' }).catch(() => null);
  return clearSessionCookie(NextResponse.redirect(new URL('/', request.url)), request);
}
