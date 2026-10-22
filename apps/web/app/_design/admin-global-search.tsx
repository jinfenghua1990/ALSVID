'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {searchAuthorizedBusinessRecords,type AdminSearchCatalog,type AdminSearchOrder,type AdminBusinessSearchResult} from './admin-business-search';
import styles from './admin-global-search.module.css';

async function readAuthorized<T>(url:string):Promise<T> {
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw new Error(response.status===401?'登录已过期':response.status===403?'当前账号无权读取':'业务数据暂时不可读取');
 const payload=await response.json().catch(()=>null) as {data?:T}|null;
 if(!payload||!('data' in payload))throw new Error('业务数据格式异常');
 return payload.data as T;
}

/** Accessible, read-only business search; never asks internal APIs to write. */
export function AdminGlobalSearch() {
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [results,setResults]=useState<AdminBusinessSearchResult[]>([]);
 const [unavailable,setUnavailable]=useState<string[]>([]);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const searchRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(open)searchRef.current?.focus();},[open]);
 async function search(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const keyword=query.trim().slice(0,100);
  if(keyword.length<2)return;
  setBusy(true);setSearched(false);setResults([]);setUnavailable([]);
  try{
   const [products,commerce]=await Promise.allSettled([
    readAuthorized<AdminSearchCatalog>('/api/control/v1/product/catalog'),
    readAuthorized<{orders:AdminSearchOrder[]}>('/api/control/v1/commerce/storefront/summary'),
   ]);
   const errors:string[]=[];
   let catalog:AdminSearchCatalog|null=null;
   let orders:AdminSearchOrder[]|null=null;
   if(products.status==='fulfilled'&&Array.isArray(products.value.models)&&Array.isArray(products.value.skus))catalog=products.value;
   else errors.push('产品主数据无权限或读取失败');
   if(commerce.status==='fulfilled'&&Array.isArray(commerce.value.orders))orders=commerce.value.orders;
   else errors.push('第一方订单无权限或读取失败');
   setUnavailable(errors);
   setResults(searchAuthorizedBusinessRecords(catalog,orders,keyword));
   setSearched(true);
  }finally{setBusy(false);}
 }
 return <div className={styles.root}>
  <button ref={triggerRef} className="av-iconbtn" type="button"
   aria-label="搜索产品与商城订单" aria-expanded={open} aria-controls="admin-business-search-popover"
   onClick={()=>setOpen(current=>!current)}>⌕</button>
  {open?<div id="admin-business-search-popover" className={styles.popup} role="dialog" aria-label="产品与订单业务搜索"
    onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);triggerRef.current?.focus();}}}>
    <div className={styles.heading}>
      <div><strong>业务搜索</strong><small>产品型号 / SKU / 自建商城订单</small></div>
      <button type="button" className={styles.close} onClick={()=>{setOpen(false);triggerRef.current?.focus();}} aria-label="关闭搜索">×</button>
    </div>
    <form className={styles.form} onSubmit={event=>{void search(event);}}>
      <input ref={searchRef} value={query} onChange={event=>{setQuery(event.target.value.slice(0,100));setSearched(false);}}
       type="search" aria-label="搜索型号、SKU、订单号或客户邮箱"
       placeholder="输入型号、SKU、订单号或邮箱" minLength={2} maxLength={100}/>
      <button disabled={busy||query.trim().length<2} type="submit">{busy?'搜索中…':'查询'}</button>
    </form>
    {unavailable.length?<p className={styles.warning} role="status">{unavailable.join('；')}。未能读取的来源不按零条结果计算。</p>:null}
    {searched?<div className={styles.results} role="status" aria-live="polite">
      <p className={styles.note}>{unavailable.length===2?'无法确认搜索结果':`当前可访问数据中找到 ${results.length} 条，单类最多显示 8 条`}</p>
      {results.map(item=><a key={item.key} className={styles.result} href={item.href}>
        <span className={styles.type}>{item.type==='model'?'型号':item.type==='sku'?'SKU':'订单'}</span>
        <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
        <span aria-hidden="true">→</span>
      </a>)}
      {!results.length&&unavailable.length<2?<p className={styles.note}>当前可读取范围内没有匹配记录。</p>:null}
    </div>:<p className={styles.note}>仅查询有权限的实际业务记录，不搜索示例数据或未连接的外部渠道。</p>}
  </div>:null}
 </div>;
}
