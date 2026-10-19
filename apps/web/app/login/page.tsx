import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PortalLoginGate } from '../_components/portal-login';
import { canAccessPortal, readInternalPreviewSession } from '../_lib/portal-access';
import { portalDefinitions, portalFromHost, type ProtectedPortalId } from '../_lib/portal-routing';
import styles from './login.module.css';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value: string | undefined, portal: ProtectedPortalId): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return portalDefinitions[portal].homePath;
  return value;
}

export default async function LoginPage({ searchParams }: { searchParams?: SearchParams }) {
  const requestHeaders = await headers();
  const hostPortal = portalFromHost(requestHeaders.get('host') ?? '');
  const params = searchParams ? await searchParams : {};
  const requestedPortal = firstValue(params.portal);
  const portal: ProtectedPortalId = requestedPortal === 'my' || requestedPortal === 'dealer' || requestedPortal === 'supplier' || requestedPortal === 'admin'
    ? requestedPortal
    : hostPortal === 'www' ? 'admin' : hostPortal;
  if (hostPortal === 'www') redirect('/');

  const redirectTo = safeReturnTo(firstValue(params.returnTo), portal);
  const session = await readInternalPreviewSession();
  const portalAuthenticated = Boolean(session && canAccessPortal(portal, session));
  if (portalAuthenticated && !session?.passwordSetupRequired) redirect(redirectTo);

  const definition = portalDefinitions[portal];
  return (
    <PortalLoginGate
      portal={portal}
      authenticated={portalAuthenticated}
      passwordSetupRequired={Boolean(session?.passwordSetupRequired)}
      passwordLoginEnabled={process.env.ALSVID_PASSWORD_LOGIN_ENABLED === 'true'}
      redirectTo={redirectTo}
      shopifyLoginUrl={process.env.ALSVID_SHOPIFY_CUSTOMER_LOGIN_URL?.trim() ?? ''}
    >
      <main className={styles.page} aria-hidden="true">
        <section className={styles.panel}>
          <div className={styles.brand}>ALSVID</div>
          <div className={styles.eyebrow}>{definition.label.toUpperCase()}</div>
          <h1 className={styles.title}>登录</h1>
          <p className={styles.lead}>进入 {definition.label}。登录后会返回你刚才访问的页面。</p>
        </section>
      </main>
    </PortalLoginGate>
  );
}
