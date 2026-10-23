import { redirect } from 'next/navigation';
import type { ProtectedPortalId } from '../_lib/portal-routing';
import { isLocale } from '../_lib/i18n/routing';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Keep old email links working, but complete password reset inside the shared
 * portal login modal so the recovery flow uses the same ALSVID visual system.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const rawPortal = firstValue(params.portal);
  const portal: ProtectedPortalId = rawPortal === 'dealer' || rawPortal === 'supplier' || rawPortal === 'my' ? rawPortal : 'admin';
  const rawLocale = firstValue(params.locale);
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const token = firstValue(params.token);
  const query = new URLSearchParams({ portal, locale });

  if (token) query.set('resetToken', token);
  else query.set('forgot', '1');

  redirect(`/${locale}/login?${query.toString()}`);
}
