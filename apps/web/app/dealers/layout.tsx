import type { ReactNode } from 'react';
import { requirePortalSession } from '../_lib/portal-access';

/** Guard the real operations route, not only its API calls. */
export default async function InternalOperationsLayout({ children }: { children: ReactNode }) {
  await requirePortalSession('admin', '/dealers');
  return <>{children}</>;
}
