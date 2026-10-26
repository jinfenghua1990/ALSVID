import {translator,type Locale} from '../../_lib/i18n';
import type {LabSpecification} from '../../_experiments/commerce-lab/catalog-contract';
import styles from './product-specifications.module.css';
export function ProductSpecifications({specifications,locale,featured=false}:{specifications:LabSpecification[];locale:Locale;featured?:boolean}){
  const rows=featured?specifications.filter(row=>row.featured):specifications;
  if(!rows.length)return null;
  const t=translator(locale);
  return <dl className={featured?styles.highlights:styles.parameters}
    data-product-specifications={featured?'featured':'all'} aria-label={t(featured?'comparison.highlights':'comparison.specifications')}>
    {rows.map((row,index)=><div key={index}>
      <dt>{row.label[locale]}</dt><dd>{row.value[locale]}</dd>
    </div>)}
  </dl>;
}
