'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import styles from './commerce.module.css';

type OrderReadiness={
 orderId:string;orderName:string;sourceChannel:string;sourceOrderStatus:string;
 sourceFinancialStatus:string|null;currency:string;totalAmount:string;
 lineCount:number;unmappedLines:number;customerMapped:boolean;
 paymentVerifiedByPsp:false;productionReleaseAllowed:false;refundExecutionAllowed:false;blockers:string[];
};
type Review={id:string;externalOrderId:string;clientRequestId:string;requestedAmount:string;
 currency:string;reason:string;state:'REVIEW_REQUESTED';requestedAt:string};
async function read<T>(path:string,body?:unknown):Promise<T>{
 const res=await fetch('/api/control/v1/commerce/operations/'+path,{
  cache:'no-store',method:body===undefined?'GET':'POST',
  ...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)}),
 });
 const payload=await res.json().catch(()=>null) as {data?:T;message?:string}|null;
 if(!res.ok)throw new Error(res.status===403?'没有订单审核或退款登记权限':res.status===401?'登录已过期':payload?.message||'数据加载失败');
 if(!payload||!('data' in payload))throw new Error('订单操作 API 返回格式异常');
 return payload.data as T;
}
export function OrderOperationsPanel(){
 const [orders,setOrders]=useState<OrderReadiness[]>([]);
 const [reviews,setReviews]=useState<Review[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [selected,setSelected]=useState('');
 const [amount,setAmount]=useState('');
 const [reason,setReason]=useState('');
 const key=useRef<{fingerprint:string;id:string}|null>(null);
 async function refresh(){
  const [o,r]=await Promise.all([read<OrderReadiness[]>('readiness'),read<Review[]>('refund-reviews')]);
  setOrders(o);setReviews(r);setSelected(prev=>o.some(x=>x.orderId===prev)?prev:(o[0]?.orderId??''));
 }
 useEffect(()=>{
  let active=true;
  async function load(){
   try{const [o,r]=await Promise.all([read<OrderReadiness[]>('readiness'),read<Review[]>('refund-reviews')]);
    if(active){setOrders(o);setReviews(r);setSelected(o[0]?.orderId??'');}
   }catch(e){if(active)setError(e instanceof Error?e.message:'无法读取交易核验记录');}
   finally{if(active)setLoading(false);}
  }
  void load();
  return ()=>{active=false};
 },[]);
 const order=orders.find(x=>x.orderId===selected);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy||!order)return;
  const payload={externalOrderId:order.orderId,requestedAmount:amount.trim(),currency:order.currency,reason:reason.trim()};
  const fingerprint=JSON.stringify(payload);
  const clientRequestId=key.current?.fingerprint===fingerprint?key.current.id:crypto.randomUUID();
  key.current={fingerprint,id:clientRequestId};
  setBusy(true);setError('');setNotice('');
  try{
   const record=await read<Review>('refund-reviews',{...payload,clientRequestId});
   setNotice('已登记内部退款审核 '+record.id+'；未向客户付款，未调用支付机构。');
   setAmount('');setReason('');key.current=null;
   await refresh();
  }catch(err){setError(err instanceof Error?err.message:'退款审核未确认保存，保留原内容以便幂等重试');}
  finally{setBusy(false);}
 }
 return <section className={styles.opsCard} aria-label="支付核验与退款审核">
  <div className={styles.opsHead}>
   <div><span className={styles.eyebrow}>订单执行安全检查 / INTERNAL ONLY</span>
   <h2>支付核验 · 生产阻断 · 退款审核</h2></div>
   <span className={styles.releaseBadge}>支付机构尚未接入 · 不开放真实退款</span>
  </div>
  <p className={styles.opsHelp}>本区只针对历史外部渠道订单。渠道返回“PAID”是**外部报告值**，不是 ALSVID 对支付机构的独立核验；无论渠道报告什么，当前都不能自动生产、确认到账或执行退款。官网自建结账仍未开放。</p>
  {loading?<p role="status">正在读取真实订单核验状态…</p>:null}
  {error?<p className={styles.notice} role="alert">{error}</p>:null}
  {notice?<p className={styles.notice} role="status">{notice}</p>:null}
  <div className={styles.opsGrid}>
   <div className={styles.opsList}>
    <h3>外部订单履约审核（最近 {orders.length} 条）</h3>
    {orders.map(o=><article key={o.orderId} className={styles.opsRow}>
     <strong>{o.orderName} <small>{o.sourceChannel}</small></strong>
     <span>原渠道财务状态：{o.sourceFinancialStatus??'未知'} · {o.totalAmount} {o.currency}</span>
     <small>订单商品 {o.lineCount} 行 · 未映射 {o.unmappedLines} 行</small>
     <p>不可自动生产：{o.blockers.join('；')}</p>
    </article>)}
    {!loading&&!orders.length?<p className={styles.opsHelp}>当前没有可读取的历史外部订单。自建官网下单功能仍是预览，并不会在此伪造订单。</p>:null}
   </div>
   <div className={styles.opsFormCol}>
    <h3>申请人工退款审核</h3>
    <p className={styles.opsHelp}>这里只记录内部调查申请。记录状态不会显示“已退款”，也不会自动发起、审批或完成 PSP 退款。</p>
    <form className={styles.opsForm} onSubmit={e=>{void submit(e)}}>
     <label>原外部订单
      <select value={selected} onChange={e=>{setSelected(e.target.value);setAmount('')}} required disabled={busy||!orders.length}>
       {orders.map(o=><option key={o.orderId} value={o.orderId}>{o.orderName} · {o.totalAmount} {o.currency}</option>)}
      </select>
     </label>
     <label>拟调查金额（{order?.currency??'EUR'}）
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="例如 50.00" required disabled={busy||!order} inputMode="decimal"/>
     </label>
     <label>审核原因及客户诉求
      <textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={1000}
       placeholder="需核验订单、支付机构交易与退款资格，不代表退款批准。" required disabled={busy||!order}/>
     </label>
     <button className={styles.button} type="submit" disabled={busy||!order||reason.trim().length<10}>
      {busy?'正在登记…':'仅登记审核（不退款）'}
     </button>
    </form>
    <h3>近期人工审核登记</h3>
    {reviews.slice(0,8).map(r=><div className={styles.opsReview} key={r.id}>
     <strong>{r.requestedAmount} {r.currency} · 待人工审核</strong>
     <small>{new Date(r.requestedAt).toLocaleString('zh-CN')} · {r.externalOrderId}</small>
    </div>)}
    {!reviews.length?<p className={styles.opsHelp}>暂无审核申请。</p>:null}
   </div>
  </div>
 </section>;
}
