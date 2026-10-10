import { cookies } from 'next/headers';

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const token = store.get('alsvid_session')?.value;
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${apiBase}${path}`, { ...init, headers, cache: 'no-store' });
}
