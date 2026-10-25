import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogShell } from '../../_components/catalog/catalog-shell';
import { ShopPreview } from '../../_components/shop-preview/shop-preview';
import { translator } from '../../_lib/i18n';
import { isLocale, locales } from '../../_lib/i18n/routing';

type Props = { params: Promise<{ locale: string }> };
export function generateStaticParams() { return locales.map(locale => ({ locale })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: translator(locale)('shopPreview.title') + ' | ALSVID', robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <CatalogShell locale={locale} active="bikes"><ShopPreview locale={locale} /></CatalogShell>;
}
