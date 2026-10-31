import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
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

const apiBase = process.env.ALSVID_API_BASE_URL ?? '';

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

type SessionLookup =
  | { kind: 'session'; session: PortalSession }
  | { kind: 'missing' }
  | { kind: 'expired' }
  | { kind: 'unavailable' };

/**
 * Layouts, pages and route handlers of a single render pass all ask for the same
 * session. `cache()` collapses them into one `/v1/auth/me` call per request
 * instead of one per caller.
 */
const lookupPortalSession = cache(async (portal: ProtectedPortalId): Promise<SessionLookup> => {
  const token = (await cookies()).get(sessionCookieNameForPortal(portal))?.value;
  if (!token) return { kind: 'missing' };

  try {
    const response = await fetch(`${apiBase}/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.status === 401 || response.status === 403) return { kind: 'expired' };
    if (!response.ok) return { kind: 'unavailable' };

    const payload = await response.json() as { data?: PortalSession };
    const session = payload.data;
    if (!session?.userId || !Array.isArray(session.roles) || !Array.isArray(session.permissions)) return { kind: 'expired' };
    return { kind: 'session', session };
  } catch {
    return { kind: 'unavailable' };
  }
});

export async function requirePortalSession(portal: ProtectedPortalId, returnTo: string): Promise<PortalSession> {
  const requestReturnTo = (await headers()).get('x-alsvid-return-to');
  const effectiveReturnTo = requestReturnTo && requestReturnTo.startsWith('/') && !requestReturnTo.startsWith('//') && !requestReturnTo.startsWith('/api/')
    ? requestReturnTo
    : returnTo;
  if (ownerPreviewAllowed(portal, process.env.NODE_ENV, process.env.ALSVID_DEV_OPEN_PORTAL)) return DEV_SESSION;

  const result = await lookupPortalSession(portal);
  if (result.kind === 'missing') loginRedirect(portal, effectiveReturnTo);
  if (result.kind === 'expired') loginRedirect(portal, effectiveReturnTo, 'session-expired');
  if (result.kind === 'unavailable') throw new Error('Unable to validate ALSVID session');

  const session = result.session;
  if (session.passwordSetupRequired) loginRedirect(portal, effectiveReturnTo, 'password-setup-required');
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
  const result = await lookupPortalSession(portal);
  return result.kind === 'session' ? result.session : null;
}
