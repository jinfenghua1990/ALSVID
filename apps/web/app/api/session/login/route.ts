import { NextResponse } from 'next/server';
import { sessionCookieName, sessionCookieOptions } from '../../../_lib/session-cookie';

const apiBase = process.env.ALSVID_API_BASE_URL ?? '';

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  let portal: string | undefined;
  try { portal = JSON.parse(body).portal; } catch { /* Forward malformed JSON to the API for validation. */ }
  const passwordLoginEnabled = portal === 'admin'
    ? process.env.ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'
    : portal === 'dealer'
      ? process.env.ALSVID_DEALER_PASSWORD_LOGIN_ENABLED === 'true'
      : portal === 'supplier'
        ? process.env.ALSVID_SUPPLIER_PASSWORD_LOGIN_ENABLED === 'true'
        : false;
  if (!passwordLoginEnabled) {
    return NextResponse.json({ message: '账户密码登录暂未启用，请使用邮箱验证码。' }, { status: 403 });
  }
  const response = await fetch(`${apiBase}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  const result = NextResponse.json({ data: payload.data.user });
  result.cookies.set(sessionCookieName(request, portal), payload.data.token, sessionCookieOptions(request, new Date(payload.data.expiresAt)));
  return result;
}
