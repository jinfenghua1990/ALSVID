import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { portalFromHost, portalUrlFor } from './_lib/portal-routing';
import { isLocale, type Locale } from './_lib/i18n';

/**
 * WWW 门户首页。
 * 按主机名进行门户判定：admin/dealer/my 主机名各自跳转门户首页，
 * www（或显式 www 主机名）渲染官方首页。
 */
export default async function WwwHomePage() {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const host = requestHeaders.get('host') ?? '';
  const portal = portalFromHost(host);

  if (portal === 'admin') redirect('/admin');
  if (portal === 'dealer') redirect('/dealer');
  if (portal === 'my') redirect('/my');

  const savedLocale = cookieStore.get('alsvid-locale')?.value;
  const preferredLanguage = requestHeaders.get('accept-language')?.toLowerCase() ?? '';
  const locale: Locale = isLocale(savedLocale)
    ? savedLocale
    : preferredLanguage.split(',').some((language) => language.trim().startsWith('de')) ? 'de' : 'en';

  redirect(`/${locale}/`);
}
