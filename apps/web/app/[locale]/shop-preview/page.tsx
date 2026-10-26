import { getLabCatalog } from '../../_experiments/commerce-lab/catalog.server';
import { LabCatalogPanel } from '../../_experiments/commerce-lab/catalog-panel';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogShell } from '../../_components/catalog/catalog-shell';
import { ShopPreview } from '../../_components/shop-preview/shop-preview';
import { translator } from '../../_lib/i18n';
import { isLocale } from '../../_lib/i18n/routing';

type Props = { params: Promise<{ locale: string }> };
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: translator(locale)('shopPreview.title') + ' | ALSVID', robots: { index: false, follow: false } };
}
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const snapshot = await getLabCatalog('public');
  return <CatalogShell locale={locale} active="bikes"><LabCatalogPanel snapshot={snapshot} locale={locale} /><ShopPreview locale={locale} /></CatalogShell>;
}
