'use client';
import {useEffect,useState} from 'react';
import {translator,type Locale} from '../../_lib/i18n';
import type {LabCatalogSnapshot,LabLocaleText,LabPublishedProduct} from '../../_experiments/commerce-lab/catalog-contract';
import {MedusaProductPreview} from './medusa-product-preview';
import styles from './database-catalog.module.css';
type BagLine={id:string;quantity:number};
const bagKey='alsvid-comparison-catalog-bag-v1';
export function DatabaseCatalog({locale,snapshot}:{locale:Locale;snapshot:LabCatalogSnapshot}){
  const t=translator(locale),[bag,setBag]=useState<BagLine[]>([]);
  const [ready,setReady]=useState(false),[bagOpen,setBagOpen]=useState(false);
  const [notice,setNotice]=useState('');
  const [bagLookup,setBagLookup]=useState<Record<string,LabLocaleText|null>>({});
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
  useEffect(()=>{
    if(!bagOpen)return;
    const controller=new AbortController();
    const missing=bag.filter(line=>!snapshot.products.some(product=>product.id===line.id));
    setBagLookup({});
    let active=true,next=0;
    const timeout=window.setTimeout(()=>controller.abort(),8000);
    async function check(line:BagLine):Promise<LabLocaleText|null>{
      try{
        const response=await fetch('/shop-preview/selection/'+encodeURIComponent(line.id),{signal:controller.signal,cache:'no-store'});
        if(!response.ok)return null;
        const data:unknown=await response.json();
        const title=(data as {title?:unknown}|null)?.title;
        if(!title||typeof title!=='object'||Array.isArray(title))return null;
        const row=title as Record<string,unknown>;
        if(!['zh','de','en'].every(key=>typeof row[key]==='string'&&(row[key] as string).trim().length>0&&(row[key] as string).length<=120))
          return null;
        return{zh:row.zh as string,de:row.de as string,en:row.en as string};
      }catch{return null;}
    }
    async function worker(){
      while(active&&next<missing.length){
        const line=missing[next++];
        if(!line)return;
        const title=controller.signal.aborted?null:await check(line);
        if(active)setBagLookup(previous=>({...previous,[line.id]:title}));
      }
    }
    for(let index=0;index<Math.min(6,missing.length);index++)void worker();
    return()=>{active=false;window.clearTimeout(timeout);controller.abort();};
  },[bagOpen,bag,snapshot.products]);
  const pages=Math.ceil(snapshot.total/snapshot.limit);
  function pageHref(page:number){
    const params=new URLSearchParams();
    if(snapshot.query)params.set('q',snapshot.query);
    if(page>1)params.set('page',String(page));
    const suffix=params.toString();return '/'+locale+'/shop-preview'+(suffix?'?'+suffix:'');
  }
  const count=bag.reduce((sum,line)=>sum+line.quantity,0);
  function add(product:LabPublishedProduct){
    if(bag.length>=100&&!bag.some(line=>line.id===product.id)){setNotice(t('comparison.bagLimit'));return;}
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
    <div className={styles.toolbar}><form className={styles.searchForm} role="search" action={'/'+locale+'/shop-preview'} method="get">
      <label>{t('shopPreview.search')}<input type="search" name="q" defaultValue={snapshot.query} maxLength={120}/></label>
      <button type="submit">{t('comparison.searchAction')}</button>
      {snapshot.query&&<a href={'/'+locale+'/shop-preview'}>{t('shopPreview.clear')}</a>}
      </form>
      <span>{t('comparison.count',{count:snapshot.products.length,total:snapshot.total})}</span>
      <button type="button" aria-expanded={bagOpen} aria-controls="database-comparison-bag" onClick={()=>setBagOpen(value=>!value)}>{t('shopPreview.bag',{count})}</button></div>
    {snapshot.state==='unavailable'?<section className={styles.empty} role="status">{t('comparison.unavailable')}</section>:
      !snapshot.products.length?<section className={styles.empty}>{snapshot.query?t('shopPreview.empty'):snapshot.total?t('comparison.noPage'):t('comparison.empty')}</section>:
      <div className={styles.grid}>{snapshot.products.map(product=><MedusaProductPreview key={product.id} product={product} locale={locale}
        detailHref={'/'+locale+'/shop-preview/products/'+product.id} onAdd={()=>add(product)}/>)}</div>}
    {snapshot.state==='connected'&&(pages>1||snapshot.page>1)&&<nav className={styles.pagination} aria-label={t('comparison.pagination')}>
      {snapshot.page>1&&<a href={pageHref(snapshot.page-1)}>{t('comparison.previous')}</a>}
      <span>{t('comparison.page',{page:snapshot.page,pages:Math.max(1,pages)})}</span>
      {snapshot.page<pages&&<a href={pageHref(snapshot.page+1)}>{t('comparison.next')}</a>}
    </nav>}
    <p role="status" className={styles.status}>{notice}</p>
    <section id="database-comparison-bag" className={styles.bag} hidden={!bagOpen}>
      <div className={styles.bagTitle}><h2>{t('shopPreview.bagTitle')}</h2><button type="button" onClick={()=>setBagOpen(false)}>{t('shopPreview.close')}</button></div>
      {bag.length?bag.map(line=>{
        const product=snapshot.products.find(product=>product.id===line.id);
        const lookup=bagLookup[line.id];
        const title=product?.title[locale]??(lookup===undefined?t('comparison.selectionPending'):lookup===null?t('comparison.unavailableSelection'):lookup[locale]);
        return <div className={styles.bagLine} key={line.id}><strong>{title}</strong>
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
