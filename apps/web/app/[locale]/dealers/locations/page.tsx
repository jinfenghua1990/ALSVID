import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '../../../_lib/i18n/routing';
import { translator } from '../../../_lib/i18n';
import { DirectoryPage } from '../../../_components/public-network/directory-page';
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = translator(locale);
  const title = t('network.locations.title');
  return { title: title + ' | ALSVID', description: t('network.locations.body'),
    alternates: { canonical: 'https://www.alsvidbike.com/' + locale + '/dealers/locations',
      languages: { zh: 'https://www.alsvidbike.com/zh/dealers/locations',
        de: 'https://www.alsvidbike.com/de/dealers/locations',
        en: 'https://www.alsvidbike.com/en/dealers/locations' } } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DirectoryPage locale={locale} kind="sales" />;
}
