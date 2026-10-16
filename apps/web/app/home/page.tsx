import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { HomePage } from '../_components/home/home-page';
import { isLocale, t, type Locale } from '../_lib/i18n';

type PreviewProps = { searchParams: Promise<{ locale?: string | string[] }> };

export async function generateMetadata({ searchParams }: PreviewProps): Promise<Metadata> {
  const { locale: requestedLocale } = await searchParams;
  const locale = Array.isArray(requestedLocale) ? requestedLocale[0] : requestedLocale;
  const activeLocale: Locale = isLocale(locale) ? locale : 'en';
  return { title: t(activeLocale, 'metadata.home.title'), description: t(activeLocale, 'metadata.home.description') };
}

/** 官方首页直连预览路由：Admin「官方首页」快捷链接与本地开发预览入口。 */
export default async function HomePreviewPage({ searchParams }: PreviewProps) {
  const [{ locale: queryLocale }, cookieStore, requestHeaders] = await Promise.all([searchParams, cookies(), headers()]);
  const requestedLocale = Array.isArray(queryLocale) ? queryLocale[0] : queryLocale;
  const savedLocale = cookieStore.get('alsvid-locale')?.value;
  const browserPrefersGerman = requestHeaders.get('accept-language')?.toLowerCase().split(',')
    .some((language) => language.trim().startsWith('de'));
  const locale: Locale = isLocale(requestedLocale) ? requestedLocale
    : isLocale(savedLocale) ? savedLocale
      : browserPrefersGerman ? 'de' : 'en';

  return <HomePage locale={locale} switcherMode="query" myUrl="/my" dealerUrl="/dealer" />;
}
