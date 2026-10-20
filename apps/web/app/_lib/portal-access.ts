import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ProtectedPortalId } from './portal-routing';
import { ownerPreviewAllowed } from './owner-preview-policy';
import { sessionCookieNameForPortal } from './session-cookie';

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

export function canAccessPortal(portal: ProtectedPortalId, session: PortalSession): boolean {
  if (portal === 'admin') return session.roles.includes('system_admin');
  if (portal === 'dealer') return session.roles.includes('system_admin') || session.roles.includes('dealer_user') || session.roles.includes('dealer_manager');
  if (portal === 'supplier') return session.roles.includes('supplier_user');
  return session.roles.includes('customer_user');
}

function loginRedirect(portal: ProtectedPortalId, returnTo: string, reason?: string): never {
  const params = new URLSearchParams({ portal, returnTo });
  if (reason) params.set('reason', reason);
  redirect(`/login?${params.toString()}`);
}

const DEV_SESSION: PortalSession = {
  userId: 'dev-owner',
  email: 'dev.owner@alsvid.local',
  displayName: 'Dev Owner',
  roles: ['customer_user'],
  permissions: [],
};

export async function requirePortalSession(portal: ProtectedPortalId, returnTo: string): Promise<PortalSession> {
  if (ownerPreviewAllowed(portal, process.env.NODE_ENV, process.env.ALSVID_DEV_OPEN_PORTAL)) return DEV_SESSION;

  const token = (await cookies()).get(sessionCookieNameForPortal(portal))?.value;
  if (!token) loginRedirect(portal, returnTo);

  const response = await fetch(`${apiBase}/v1/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (response.status === 401 || response.status === 403) loginRedirect(portal, returnTo, 'session-expired');
  if (!response.ok) throw new Error('Unable to validate ALSVID session');

  const payload = await response.json() as { data?: PortalSession };
  const session = payload.data;
  if (!session?.userId || !Array.isArray(session.roles) || !Array.isArray(session.permissions)) loginRedirect(portal, returnTo, 'session-expired');
  if (session.passwordSetupRequired) loginRedirect(portal, returnTo, 'password-setup-required');
  if (!canAccessPortal(portal, session)) loginRedirect(portal, returnTo, 'portal-access-denied');
  return session;
}

export function requireInternalPreviewSession(): Promise<PortalSession> {
  return requirePortalSession('admin', '/admin');
}

// The launcher accepts any valid Internal session, including a session that is
// temporarily limited to completing mandatory password setup. Each destination
// remains responsible for its own authorization rules.
export function readInternalPreviewSession(): Promise<PortalSession | null> {
  return readPortalSession('admin');
}

/** Reads the server-selected portal cookie; authentication never confers portal permissions. */
export async function readPortalSession(portal: ProtectedPortalId): Promise<PortalSession | null> {
  const token = (await cookies()).get(sessionCookieNameForPortal(portal))?.value;
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
