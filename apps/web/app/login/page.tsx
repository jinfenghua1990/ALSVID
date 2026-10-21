import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PortalLoginGate } from '../_components/portal-login';
import { canAccessPortal, readPortalSession } from '../_lib/portal-access';
import { portalDefinitions, portalFromHost, type ProtectedPortalId } from '../_lib/portal-routing';
import { isLocale, localeCookie, preferredLocale } from '../_lib/i18n/routing';

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
  const session = await readPortalSession(portal);
  const portalAuthenticated = Boolean(session && canAccessPortal(portal, session));
  if (portalAuthenticated && !session?.passwordSetupRequired) redirect(redirectTo);

  const requestedLocale = requestHeaders.get('x-alsvid-locale');
  const savedLocale = (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(requestedLocale) ? requestedLocale : preferredLocale(savedLocale, requestHeaders.get('accept-language') ?? '');
  return (
    <PortalLoginGate
      portal={portal}
      locale={locale}
      authenticated={portalAuthenticated}
      passwordSetupRequired={Boolean(session?.passwordSetupRequired)}
      passwordLoginEnabled={portal === 'admin'
        ? process.env.ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'
        : process.env.ALSVID_PASSWORD_LOGIN_ENABLED === 'true'}
      redirectTo={redirectTo}
    />
  );
}
