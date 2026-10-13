import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { portalFromHost, portalUrlFor } from './_lib/portal-routing';

export default async function HomePage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const portal = portalFromHost(host);

  if (portal === 'admin') redirect('/admin');
  if (portal === 'dealer') redirect('/dealer');
  if (portal === 'my') redirect('/my');

  const myUrl = portalUrlFor(host, 'my');
  const dealerUrl = portalUrlFor(host, 'dealer');

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 32, background: '#f5f5f2', color: '#1d2428' }}>
      <section style={{ width: 'min(720px, 100%)', padding: 40, border: '1px solid #d9dedb', borderRadius: 24, background: '#fff' }}>
        <p style={{ letterSpacing: '0.18em', fontSize: 12, color: '#68757b' }}>ALSVID / WWW</p>
        <h1 style={{ margin: '12px 0', fontSize: 'clamp(32px, 6vw, 64px)', lineHeight: 1 }}>Explore Further</h1>
        <p style={{ maxWidth: 560, color: '#68757b', lineHeight: 1.8 }}>ALSVID 公开官网只负责品牌、产品和公开信息展示，不执行公司内部登录。</p>
        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
          <Link href={myUrl} style={{ padding: '12px 16px', borderRadius: 999, background: '#1d2428', color: '#fff', textDecoration: 'none' }}>进入 My ALSVID</Link>
          <Link href={dealerUrl} style={{ padding: '12px 16px', borderRadius: 999, border: '1px solid #c9d0ce', color: '#1d2428', textDecoration: 'none' }}>经销商入口</Link>
        </nav>
      </section>
    </main>
  );
}
