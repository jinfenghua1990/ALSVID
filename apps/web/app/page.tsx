import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { portalFromHost } from './_lib/portal-routing';
import { localeCookie, preferredLocale } from './_lib/i18n/routing';

/**
 * WWW 门户首页。
 * 按主机名进行门户判定：admin/dealer/my 主机名各自跳转门户首页，
 * www（或显式 www 主机名）渲染官方首页。
 */
export default async function WwwHomePage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const portal = portalFromHost(host);

  if (portal === 'admin') redirect('/admin');
  if (portal === 'dealer') redirect('/dealer');
  if (portal === 'my') redirect('/my');

  const saved = (await cookies()).get(localeCookie)?.value;
  redirect(`/${preferredLocale(saved)}/`);
}
