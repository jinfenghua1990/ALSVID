import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface PortalSession {
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  passwordState?: 'UNSET' | 'INITIAL' | 'ACTIVE' | 'RESET_REQUIRED';
  passwordSetupRequired?: boolean;
}

const apiBase = process.env.ALSVID_API_BASE_URL ?? 'http://localhost:4000/api';

export async function requireInternalPreviewSession(): Promise<PortalSession> {
  const token = (await cookies()).get('alsvid_session')?.value;
  if (!token) redirect('/login');

  const response = await fetch(`${apiBase}/v1/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) redirect('/login?reason=session-expired');
  if (!response.ok) throw new Error('Unable to validate ALSVID session');

  const payload = await response.json() as { data?: PortalSession };
  const session = payload.data;
  if (!session?.userId || !Array.isArray(session.roles) || !Array.isArray(session.permissions)) redirect('/login?reason=session-expired');
  if (session.passwordSetupRequired) redirect('/?reason=password-setup-required');

  // Authentication proves identity; Admin access remains an explicit role check.
  if (!session.roles.includes('system_admin')) redirect('/login?reason=portal-access-denied');
  return session;
}

// The launcher accepts any valid Internal session, including a session that is
// temporarily limited to completing mandatory password setup. Each destination
// remains responsible for its own authorization rules.
export async function readInternalPreviewSession(): Promise<PortalSession | null> {
  const token = (await cookies()).get('alsvid_session')?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${apiBase}/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: PortalSession };
    const session = payload.data;
    if (!session?.userId || !Array.isArray(session.roles) || !Array.isArray(session.permissions)) return null;
    return session;
  } catch {
    return null;
  }
}
