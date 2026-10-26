import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {CatalogShell} from '../../../_components/catalog/catalog-shell';
import {ShopPreview} from '../../../_components/shop-preview/shop-preview';
import {translator} from '../../../_lib/i18n';
import {isLocale} from '../../../_lib/i18n/routing';
type Props={params:Promise<{locale:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  return isLocale(locale)?{title:translator(locale)('comparison.referenceView')+' | ALSVID',robots:{index:false,follow:false}}:{};
}
export default async function Page({params}:Props){
  const {locale}=await params;if(!isLocale(locale))notFound();
  return <CatalogShell locale={locale} active="bikes"><p style={{padding:'16px 5vw'}}><a href={'/'+locale+'/shop-preview'}>{translator(locale)('comparison.mainView')} →</a></p><ShopPreview locale={locale}/></CatalogShell>;
}
