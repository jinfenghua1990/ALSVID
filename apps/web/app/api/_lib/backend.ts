import { cookies, headers } from 'next/headers';
import { sessionCookieNameForApiRequest } from '../../_lib/session-cookie';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const requestHeaders = await headers();
  const token = store.get(sessionCookieNameForApiRequest(requestHeaders.get('host') ?? '', path))?.value;
  const outgoingHeaders = new Headers(init.headers);
  outgoingHeaders.set('content-type', 'application/json');
  if (token) outgoingHeaders.set('authorization', `Bearer ${token}`);
  return fetch(`${apiBase}${path}`, { ...init, headers: outgoingHeaders, cache: 'no-store' });
}
