/**
 * Adapted from medusajs/dtc-starter ProductPreview, MIT © 2022 Medusa.
 * Imported original: external/medusa-dtc/apps/storefront/src/modules/products/components/product-preview.
 * ALSVID replaces Medusa-specific queries with the isolated comparison catalog contract.
 */
import {translator,type Locale} from '../../_lib/i18n';
import type {LabComparisonProduct} from '../../_experiments/commerce-lab/catalog-contract';
import {ProductSpecifications} from './product-specifications';
import styles from './database-catalog.module.css';
export function MedusaProductPreview({product,locale,detailHref,onAdd,customImageSrc,detail=false,headingLevel}:{product:LabComparisonProduct;locale:Locale;
  detailHref?:string;onAdd?:()=>void;customImageSrc?:string;detail?:boolean;headingLevel?:'h1'|'h2'}){
  const t=translator(locale);
  const image=product.hasCustomImage?(customImageSrc??'/shop-preview/media/'+product.id+'?v='+product.version):product.referenceImage==='FC1'?'/home/original/fc1-product.webp':
    product.referenceImage==='FC2'?'/products/fc2/side-studio-1536.webp':null;
  const price=product.proposedPriceMinor===null?t('shopPreview.price'):
    t('comparison.proposedPrice',{amount:new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(product.proposedPriceMinor/100)});
  const Heading=headingLevel??(detail?'h1':'h2');
  return <article className={styles.product+(detail?' '+styles.detailProduct:'')} data-testid="product-wrapper" data-comparison-product={product.id}>
    {detailHref?<a href={detailHref} className={styles.thumbnail} aria-label={product.title[locale]}>
      {image?<img src={image} alt={product.title[locale]+' · '+t('shopPreview.reference')} width={700} height={460}/>:<span>{t('comparison.imagePending')}</span>}
    </a>:<div className={styles.thumbnail+' '+styles.readonlyThumbnail}>
      {image?<img src={image} alt={product.title[locale]+' · '+t('shopPreview.reference')} width={700} height={460}/>:<span>{t('comparison.imagePending')}</span>}
    </div>}
    <div className={styles.productBody}><small>{product.code}</small>
      <div className={styles.productName}><Heading data-testid="product-title">{product.title[locale]}</Heading><span>{price}</span></div>
      <p>{product.description[locale]}</p><ProductSpecifications specifications={product.specifications} locale={locale} featured/><small>{t('shopPreview.reference')}</small>
      {(detailHref||onAdd)&&<div className={styles.actions}>{detailHref&&<a href={detailHref}>{t('comparison.inspect')}</a>}
        {onAdd&&<button type="button" onClick={onAdd}>{t('shopPreview.add')}</button>}</div>}
    </div>
  </article>;
}
