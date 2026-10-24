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
  const forgotPasswordRequested = firstValue(params.forgot) === '1';
  const resetToken = firstValue(params.resetToken) ?? '';
  const openOnLoad = portal === 'dealer' && firstValue(params.open) === '1';
  const session = await readPortalSession(portal);
  const portalAuthenticated = Boolean(session && canAccessPortal(portal, session));
  if (portalAuthenticated && !session?.passwordSetupRequired && !resetToken) redirect(redirectTo);

  const queryLocale = firstValue(params.locale);
  const requestedLocale = requestHeaders.get('x-alsvid-locale');
  const savedLocale = (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(queryLocale) ? queryLocale : isLocale(requestedLocale) ? requestedLocale : preferredLocale(savedLocale);
  return (
    <PortalLoginGate
      portal={portal}
      locale={locale}
      authenticated={portalAuthenticated}
      passwordSetupRequired={Boolean(session?.passwordSetupRequired)}
      passwordLoginEnabled={portal === 'admin'
        ? process.env.ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'
        : portal === 'dealer'
          ? process.env.ALSVID_DEALER_PASSWORD_LOGIN_ENABLED === 'true'
          : portal === 'supplier'
            ? process.env.ALSVID_SUPPLIER_PASSWORD_LOGIN_ENABLED === 'true'
            : false}
      forgotPasswordRequested={forgotPasswordRequested}
      resetToken={resetToken}
      openOnLoad={openOnLoad}
      redirectTo={redirectTo}
    />
  );
}
