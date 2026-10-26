/**
 * Adapted from medusajs/dtc-starter ProductPreview, MIT © 2022 Medusa.
 * Imported original: external/medusa-dtc/apps/storefront/src/modules/products/components/product-preview.
 * ALSVID replaces Medusa-specific queries with the isolated comparison catalog contract.
 */
import {translator,type Locale} from '../../_lib/i18n';
import type {LabComparisonProduct} from '../../_experiments/commerce-lab/catalog-contract';
import styles from './database-catalog.module.css';
export function MedusaProductPreview({product,locale,onInspect,onAdd,customImageSrc}:{product:LabComparisonProduct;locale:Locale;
  onInspect?:()=>void;onAdd?:()=>void;customImageSrc?:string}){
  const t=translator(locale);
  const image=product.hasCustomImage?(customImageSrc??'/shop-preview/media/'+product.id+'?v='+product.version):product.referenceImage==='FC1'?'/home/original/fc1-product.webp':
    product.referenceImage==='FC2'?'/products/fc2/side-studio-1536.webp':null;
  const price=product.proposedPriceMinor===null?t('shopPreview.price'):
    t('comparison.proposedPrice',{amount:new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(product.proposedPriceMinor/100)});
  return <article className={styles.product} data-testid="product-wrapper" data-comparison-product={product.id}>
    {onInspect?<button type="button" className={styles.thumbnail} onClick={onInspect} aria-label={product.title[locale]}>
      {image?<img src={image} alt={product.title[locale]+' · '+t('shopPreview.reference')} width={700} height={460}/>:<span>{t('comparison.imagePending')}</span>}
    </button>:<div className={styles.thumbnail+' '+styles.readonlyThumbnail}>
      {image?<img src={image} alt={product.title[locale]+' · '+t('shopPreview.reference')} width={700} height={460}/>:<span>{t('comparison.imagePending')}</span>}
    </div>}
    <div className={styles.productBody}><small>{product.code}</small>
      <div className={styles.productName}><h2 data-testid="product-title">{product.title[locale]}</h2><span>{price}</span></div>
      <p>{product.description[locale]}</p><small>{t('shopPreview.reference')}</small>
      {(onInspect||onAdd)&&<div className={styles.actions}>{onInspect&&<button type="button" onClick={onInspect}>{t('comparison.inspect')}</button>}
        {onAdd&&<button type="button" onClick={onAdd}>{t('shopPreview.add')}</button>}</div>}
    </div>
  </article>;
}
