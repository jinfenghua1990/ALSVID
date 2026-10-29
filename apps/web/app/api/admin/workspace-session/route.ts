import { NextResponse } from 'next/server';
import { requirePortalSession } from '../../../_lib/portal-access';

/**
 * Only reports whether the current request is still authorized for Admin.
 * React's persistent client layout must not silently bypass a fresh session
 * check on internal soft navigation. No private account data is returned.
 */
export async function GET(): Promise<NextResponse> {
  const session = await requirePortalSession('admin', '/admin');
  // Minimal verified subject identifier; no token or privileged profile data.
  return NextResponse.json({ ok: true, userId: session.userId }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
