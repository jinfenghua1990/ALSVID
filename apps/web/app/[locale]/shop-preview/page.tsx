import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {CatalogShell} from '../../_components/catalog/catalog-shell';
import {DatabaseCatalog} from '../../_components/shop-preview/database-catalog';
import {publishedComparisonCatalog} from '../../_experiments/commerce-lab/published-catalog.server';
import {translator} from '../../_lib/i18n';
import {isLocale} from '../../_lib/i18n/routing';
type Props={params:Promise<{locale:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  return isLocale(locale)?{title:translator(locale)('shopPreview.title')+' | ALSVID',robots:{index:false,follow:false}}:{};
}
export default async function Page({params}:Props){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const snapshot=await publishedComparisonCatalog();
  return <CatalogShell locale={locale} active="bikes"><DatabaseCatalog locale={locale} snapshot={snapshot}/></CatalogShell>;
}
