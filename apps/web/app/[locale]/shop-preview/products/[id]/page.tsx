import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {CatalogShell} from '../../../../_components/catalog/catalog-shell';
import {MedusaProductPreview} from '../../../../_components/shop-preview/medusa-product-preview';
import {ProductSpecifications} from '../../../../_components/shop-preview/product-specifications';
import {publishedComparisonProduct} from '../../../../_experiments/commerce-lab/published-catalog.server';
import {translator} from '../../../../_lib/i18n';
import {isLocale,locales} from '../../../../_lib/i18n/routing';
import styles from '../../../../_components/shop-preview/product-detail.module.css';
type Props={params:Promise<{locale:string;id:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale,id}=await params;if(!isLocale(locale))return{};
  const snapshot=await publishedComparisonProduct(id);
  const path='/shop-preview/products/'+encodeURIComponent(id);
  return{title:(snapshot.state==='ready'?snapshot.product.title[locale]:translator(locale)('shopPreview.title'))+' | ALSVID',
    robots:{index:false,follow:false},
    ...(snapshot.state==='ready'?{alternates:{canonical:'https://www.alsvidbike.com/'+locale+path,
      languages:Object.fromEntries(locales.map(language=>[language,'https://www.alsvidbike.com/'+language+path]))}}:{})};
}
export default async function Page({params}:Props){
  const {locale,id}=await params;if(!isLocale(locale))notFound();
  const snapshot=await publishedComparisonProduct(id);
  if(snapshot.state==='not-found')notFound();
  const t=translator(locale),back='/'+locale+'/shop-preview';
  return <CatalogShell locale={locale} active="bikes"><main className={styles.page} data-public-product-detail>
    <nav className={styles.breadcrumb} aria-label={t('comparison.backToCatalog')}><a href={back}>← {t('comparison.backToCatalog')}</a></nav>
    {snapshot.state!=='ready'?<section className={styles.notice} role="status">{t('comparison.productUnavailable')}</section>:<>
      <p className={styles.notice}>{t('comparison.notice')}</p>
      <MedusaProductPreview product={snapshot.product} locale={locale} detail/>
      {snapshot.product.specifications.length>0&&<section className={styles.specificationSection}>
        <h2>{t('comparison.specifications')}</h2><ProductSpecifications specifications={snapshot.product.specifications} locale={locale}/>
      </section>}
    </>}
  </main></CatalogShell>;
}
