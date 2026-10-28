import { NextResponse } from 'next/server';
import { requirePortalSession } from '../../../_lib/portal-access';

/**
 * Only reports whether the current request is still authorized for Admin.
 * React's persistent client layout must not silently bypass a fresh session
 * check on internal soft navigation. No private account data is returned.
 */
export async function GET(): Promise<NextResponse> {
  await requirePortalSession('admin', '/admin');
  return NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
