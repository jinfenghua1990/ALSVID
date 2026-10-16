import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { portalUrlFor } from '../_lib/portal-routing';
/** Preserve the existing Admin shortcut while using the public localized page. */
export default async function HomePreviewPage() {
  const host = (await headers()).get('host') ?? '';
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  redirect(isLocal ? '/de/' : `${portalUrlFor(host, 'www')}/de/`);
}
