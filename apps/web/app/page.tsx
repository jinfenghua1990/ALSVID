import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { portalFromHost, portalUrlFor } from './_lib/portal-routing';
import { HomePage } from './_components/home/home-page';

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

  const myUrl = portalUrlFor(host, 'my');
  const dealerUrl = portalUrlFor(host, 'dealer');

  return <HomePage myUrl={myUrl} dealerUrl={dealerUrl} />;
}
