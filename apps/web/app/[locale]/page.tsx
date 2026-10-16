import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { portalFromHost, portalUrlFor } from '../_lib/portal-routing';
import { HomePage } from '../_components/home/home-page';
import { isLocale, t } from '../_lib/i18n';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) return {};
  const locale = requestedLocale;
  return {
    metadataBase: new URL('https://www.chaibenn.com'),
    title: t(locale, 'metadata.home.title'),
    description: t(locale, 'metadata.home.description'),
    alternates: {
      canonical: `/${locale}/`,
      languages: { de: '/de/', en: '/en/' },
    },
  };
}

export default async function LocalizedWwwHome({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) notFound();
  const locale = requestedLocale;
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const portal = portalFromHost(host);

  if (portal === 'admin') redirect('/admin');
  if (portal === 'dealer') redirect('/dealer');
  if (portal === 'my') redirect('/my');

  return (
    <>
      <HomePage
        locale={locale}
        myUrl={portalUrlFor(host, 'my')}
        dealerUrl={portalUrlFor(host, 'dealer')}
      />
    </>
  );
}
