'use client';
import { useEffect,useRef,useState } from 'react';
import styles from '../admin/portal-page.module.css';
type Line={id:string;lineNo:number;lineKind?:'PURCHASE'|'GIFT';description:string;orderedQuantity:string;unit:string;requestedDate:string|null};
type PurchaseOrder={id:string;poNumber:string;version:number;status:string;currency:string;supplierName:string;issuedAt:string|null;lines:Line[]};
async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const r=await fetch('/api/control/v1/supplier'+path,{method,cache:'no-store',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
 const p=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status===403)throw new Error('当前账号尚未绑定已启用供应商组织，或没有采购单操作权限。');if(r.status===401)throw new Error('登录已过期，请重新登录。');throw new Error(r.status===409?'采购单状态已变化，请刷新后重试。':p.message??'请求失败');}
 if(!p||!('data' in p))throw new Error('服务器响应格式异常');
 return p.data as T;
}
export function SupplierOrdersClient(){
 const [orders,setOrders]=useState<PurchaseOrder[]>([]);
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const [selected,setSelected]=useState('');
 const [note,setNote]=useState('');
 const [error,setError]=useState('');
 const [result,setResult]=useState('');
 const [busy,setBusy]=useState(false);
 const retry=useRef<{poId:string;fingerprint:string;requestId:string}|null>(null);
 async function reload(){
  setState('loading');setError('');
  try{const rows=await api<PurchaseOrder[]>('/purchase-orders');if(!Array.isArray(rows))throw new Error('列表格式异常');setOrders(rows);setState('ready');}
  catch(e){setState('error');setError(e instanceof Error?e.message:'无法读取采购单');}
 }
 useEffect(()=>{void reload();},[]);
 const chosen=orders.find(x=>x.id===selected);
 async function confirm(){
  if(!chosen||busy||chosen.status!=='ISSUED'||note.trim().length<5)return;
  const payload={
   expectedVersion:chosen.version,note:note.trim(),lines:chosen.lines.map(x=>({purchaseOrderLineId:x.id,confirmedQuantity:x.orderedQuantity,confirmedDate:x.requestedDate??undefined})),
  };
  const fingerprint=JSON.stringify(payload);
  const requestId=retry.current?.poId===chosen.id&&retry.current.fingerprint===fingerprint
   ?retry.current.requestId:crypto.randomUUID();
  retry.current={poId:chosen.id,fingerprint,requestId};
  setBusy(true);setError('');setResult('');
  try{
   await api('/purchase-orders/'+encodeURIComponent(chosen.id)+'/acknowledge','POST',{...payload,clientRequestId:requestId});
   retry.current=null;setNote('');setResult('采购单确认已真实保存，内部采购状态同步为已确认。');
   await reload();
  }catch(e){setError(e instanceof Error?e.message:'保存失败');}
  finally{setBusy(false);}
 }
 return <section className={styles.section}>
   <div className={styles.sectionHeadCompact}><h2>我可访问的采购单</h2>
    <button type="button" disabled={busy||state==='loading'} onClick={()=>void reload()}>刷新真实记录</button>
   </div>
   {state==='error'?<div role="alert" className={styles.callout}>{error}（读取失败不等于无采购单）</div>:
   state==='loading'?<p role="status">正在读取供应商采购单…</p>:
   !orders.length?<div className={styles.callout}>当前账号没有可访问的已发布采购单。需要管理员核验并绑定供应商组织后，才会出现真实记录。</div>:
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
     <thead><tr><th>采购单号</th><th>供应商</th><th>状态</th><th>行数</th><th>操作</th></tr></thead>
     <tbody>{orders.map(po=><tr key={po.id}><td>{po.poNumber}</td><td>{po.supplierName}</td><td>{po.status}</td>
      <td>{po.lines.length}</td><td><button type="button" onClick={()=>{setSelected(po.id);setNote('');setError('');setResult('');}}>查看 / 确认</button></td></tr>)}</tbody>
    </table></div>}
   {chosen?<div className={styles.callout}>
    <h3>{chosen.poNumber} · {chosen.status}</h3>
    <p>币种 {chosen.currency} · 已发布版本 {chosen.version}。采购单价格与数量不可在此修改。</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}>
     <thead><tr><th>行号</th><th>行性质</th><th>物品</th><th>数量</th><th>要求日期</th></tr></thead>
     <tbody>{chosen.lines.map(l=><tr key={l.id}><td>{l.lineNo}</td><td>{l.lineKind==='GIFT'?'供应商赠品':'正常采购'}</td><td>{l.description||'已登记物料'}</td><td>{l.orderedQuantity} {l.unit}</td><td>{l.requestedDate??'待定'}</td></tr>)}</tbody>
    </table></div>
    {chosen.status==='ISSUED'?<div style={{display:'grid',gap:10,marginTop:16}}>
     <label>确认说明（必填，不修改采购条件）<textarea value={note} maxLength={1000} rows={3}
      onChange={e=>setNote(e.target.value)} placeholder="已核对完整采购单，确认全部已发布数量及要求交期。" /></label>
     <button type="button" disabled={busy||note.trim().length<5} onClick={()=>void confirm()}>
      {busy?'提交中…':'确认全部采购单（保存到 Admin）'}</button>
    </div>:<p>该采购单不再处于待确认状态。如需更改交期/数量，请联系 ALSVID 采购负责人。</p>}
    {error?<p role="alert">{error}</p>:null}
    {result?<p role="status">{result}</p>:null}
   </div>:null}
  </section>;
}
