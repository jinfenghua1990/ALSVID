import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { HomePage } from '../_components/home/home-page';
import { isLocale } from '../_lib/i18n/routing';
import { translator } from '../_lib/i18n';
import { portalUrlFor } from '../_lib/portal-routing';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  return { title: t('meta.title'), description: t('meta.description'), alternates: {
    canonical: `https://www.chaibenn.com/${locale}/`, languages: { de: 'https://www.chaibenn.com/de/', en: 'https://www.chaibenn.com/en/' },
  } };
}
export default async function LocalizedHome({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const prefix = host.toLowerCase().split('.')[0];
  if (prefix === 'admin' || prefix === 'my' || prefix === 'dealer') redirect(`/${prefix}`);
  return <HomePage locale={locale} myUrl={portalUrlFor(host, 'my')} dealerUrl={portalUrlFor(host, 'dealer')} />;
}
