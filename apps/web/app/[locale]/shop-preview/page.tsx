import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {CatalogShell} from '../../_components/catalog/catalog-shell';
import {DatabaseCatalog} from '../../_components/shop-preview/database-catalog';
import {publishedComparisonCatalog} from '../../_experiments/commerce-lab/published-catalog.server';
import {translator} from '../../_lib/i18n';
import {isLocale} from '../../_lib/i18n/routing';
type Props={params:Promise<{locale:string}>;searchParams:Promise<{page?:string|string[];q?:string|string[]}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  return isLocale(locale)?{title:translator(locale)('shopPreview.title')+' | ALSVID',robots:{index:false,follow:false}}:{};
}
export default async function Page({params,searchParams}:Props){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const search=await searchParams;
  const rawPage=typeof search.page==='string'?search.page:'1';
  const page=/^[1-9][0-9]{0,4}$/.test(rawPage)?Number(rawPage):1;
  const query=typeof search.q==='string'?search.q:'';
  const snapshot=await publishedComparisonCatalog(page,query);
  return <CatalogShell locale={locale} active="bikes"><DatabaseCatalog locale={locale} snapshot={snapshot}/></CatalogShell>;
}
