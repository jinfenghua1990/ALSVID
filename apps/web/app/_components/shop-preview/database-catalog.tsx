'use client';
import {useEffect,useState} from 'react';
import {translator,type Locale} from '../../_lib/i18n';
import type {LabCatalogSnapshot,LabPublishedProduct} from '../../_experiments/commerce-lab/catalog-contract';
import {MedusaProductPreview} from './medusa-product-preview';
import styles from './database-catalog.module.css';
type BagLine={id:string;quantity:number};
const bagKey='alsvid-comparison-catalog-bag-v1';
export function DatabaseCatalog({locale,snapshot}:{locale:Locale;snapshot:LabCatalogSnapshot}){
  const t=translator(locale),[query,setQuery]=useState(''),[bag,setBag]=useState<BagLine[]>([]);
  const [ready,setReady]=useState(false),[bagOpen,setBagOpen]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    try{
      const value:unknown=JSON.parse(sessionStorage.getItem(bagKey)??'[]');
      if(Array.isArray(value)&&value.length<=100){
        const seen=new Set<string>(),lines:BagLine[]=[];
        for(const row of value){
          if(!row||typeof row.id!=='string'||!/^[a-f0-9-]{36}$/i.test(row.id)||seen.has(row.id)||
            !Number.isInteger(row.quantity)||row.quantity<1||row.quantity>9)throw new Error('Invalid comparison bag');
          seen.add(row.id);lines.push({id:row.id,quantity:row.quantity});
        }setBag(lines);
      }
    }catch{/* Browser storage is optional and untrusted. */}
    setReady(true);
  },[]);
  useEffect(()=>{if(ready)try{sessionStorage.setItem(bagKey,JSON.stringify(bag));}catch{/* retain in-memory selection */}},[bag,ready]);
  const visible=snapshot.products.filter(p=>(p.code+' '+p.title[locale]).toLowerCase().includes(query.toLowerCase()));
  const count=bag.reduce((sum,line)=>sum+line.quantity,0);
  function add(product:LabPublishedProduct){
    setBag(previous=>{
      const current=previous.find(line=>line.id===product.id);
      return current?previous.map(line=>line.id===product.id?{...line,quantity:Math.min(9,line.quantity+1)}:line):
        [...previous,{id:product.id,quantity:1}];
    });
    setNotice(t('shopPreview.added',{model:product.title[locale]}));
  }
  return <main className={styles.page} lang={locale} data-database-catalog data-state={snapshot.state}>
    <div className={styles.notice}>{t('comparison.notice')}</div>
    <section className={styles.hero}><p>{t('shopPreview.kicker')}</p><h1>{t('comparison.heading')}</h1>
      <p>{t('comparison.body')}</p><div className={styles.links}><a href={'/'+locale+'/bikes'}>{t('shopPreview.original')} →</a>
        <a href={'/'+locale+'/shop-preview/reference'}>{t('comparison.referenceView')} →</a></div></section>
    <div className={styles.toolbar}><label>{t('shopPreview.search')}<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <span>{t('comparison.count',{count:visible.length,total:snapshot.total})}</span>
      <button type="button" aria-expanded={bagOpen} aria-controls="database-comparison-bag" onClick={()=>setBagOpen(value=>!value)}>{t('shopPreview.bag',{count})}</button></div>
    {snapshot.state==='unavailable'?<section className={styles.empty} role="status">{t('comparison.unavailable')}</section>:
      !snapshot.products.length?<section className={styles.empty}>{t('comparison.empty')}</section>:
      <div className={styles.grid}>{visible.map(product=><MedusaProductPreview key={product.id} product={product} locale={locale}
        detailHref={'/'+locale+'/shop-preview/products/'+product.id} onAdd={()=>add(product)}/>)}</div>}
    {snapshot.state==='connected'&&snapshot.products.length>0&&!visible.length&&<p className={styles.empty}>{t('shopPreview.empty')}</p>}
    <p role="status" className={styles.status}>{notice}</p>
    <section id="database-comparison-bag" className={styles.bag} hidden={!bagOpen}>
      <div className={styles.bagTitle}><h2>{t('shopPreview.bagTitle')}</h2><button type="button" onClick={()=>setBagOpen(false)}>{t('shopPreview.close')}</button></div>
      {bag.length?bag.map(line=>{
        const product=snapshot.products.find(product=>product.id===line.id);
        return <div className={styles.bagLine} key={line.id}><strong>{product?.title[locale]??t('comparison.unavailableSelection')}</strong>
          <label>{t('shopPreview.quantity')}<input type="number" min={1} max={9} value={line.quantity} onChange={event=>{
            const quantity=Number(event.target.value);
            if(Number.isInteger(quantity)&&quantity>=1&&quantity<=9)setBag(previous=>previous.map(item=>item.id===line.id?{...item,quantity}:item));
          }}/></label><button type="button" onClick={()=>setBag(previous=>previous.filter(item=>item.id!==line.id))}>{t('shopPreview.remove')}</button></div>;
      }):<p>{t('shopPreview.bagEmpty')}</p>}
      <p>{t('shopPreview.noTotal')}</p><button type="button" disabled>{t('shopPreview.noCheckout')}</button>
    </section>
    <p className={styles.footnote}>{t('comparison.refresh')}</p>
  </main>;
}
