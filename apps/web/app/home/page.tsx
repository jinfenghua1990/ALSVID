import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { localeCookie } from '../_lib/i18n/routing';
import { requestLocale } from '../_lib/i18n/request-locale';
import { portalUrlFor } from '../_lib/portal-routing';

/** Preserve the existing Admin shortcut while using the public localized page. */
export default async function HomePreviewPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const isLocal = /^(localhost|127\.0.0.1)(:|$)/.test(host);
  const saved = (await cookies()).get(localeCookie)?.value;
  const locale = requestLocale(saved, requestHeaders);
  redirect(isLocal ? `/${locale}/` : `${portalUrlFor(host, 'www')}/${locale}/`);
}
