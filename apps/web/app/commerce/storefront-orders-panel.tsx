'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import styles from './commerce.module.css';
import { filterStorefrontOrders } from './storefront-order-filter';
import { resolveAdminPricingTarget, type PricingTargetStatus } from '../_lib/admin-sku-pricing-navigation';

type Sku={id:string;sku:string;name:string;colorCode:string|null;marketCode:string|null;modelCode:string;variantCode:string};
type Price={id:string;skuId:string;sku:string;skuName:string;marketCountry:string;currency:string;
 unitPriceGross:string;taxRateBasisPoints:number;status:'DRAFT'|'ACTIVE'|'RETIRED';version:number;
 effectiveFrom:string|null;retiredAt:string|null;createdAt:string};
type Line={id:string;skuId:string;skuCode:string;skuName:string;colorCode:string|null;quantity:number;
 unitPriceGross:string;taxRateBasisPoints:number;lineNetAmount:string;lineTaxAmount:string;lineGrossAmount:string};
type Order={id:string;orderNumber:string;source:'ALSVID_WWW';customerEmail:string;marketCountry:string;currency:string;
 status:string;paymentStatus:string;taxConfigurationStatus:string;totalNetAmount:string;totalTaxAmount:string;
 totalGrossAmount:string;version:number;createdAt:string;lines:Line[];checkoutEnabled:false;
 productionDemandAllowed:false;blockers:string[]};
type OrderEvent={id:string;eventType:'ORDER_CREATED'|'STATUS_CHANGED'|'PAYMENT_STATUS_CHANGED';
 fromStatus:string|null;toStatus:string;fromPaymentStatus:string|null;toPaymentStatus:string;
 actorUserId:string|null;metadata:Record<string,unknown>;occurredAt:string};
type OrderDetail=Order&{events:OrderEvent[]};
const orderStatusLabel=(status:string):string=>({
 DRAFT:'内部草稿',SUBMITTED:'已提交（待支付通道）',AWAITING_PAYMENT:'等待支付',
 PAYMENT_PENDING:'支付处理中',PAYMENT_VERIFIED:'付款已核验',FULFILLMENT_PENDING:'待履约',
 IN_PRODUCTION:'生产中',FULFILLED:'已交付',CLOSED:'已关闭',CANCELLED:'已取消',
} as Record<string,string>)[status]??status;
type Factory={id:string;code:string;name:string};
type Summary={checkoutEnabled:false;skus:Sku[];prices:Price[];orders:Order[];factories:Factory[]};
type ItemInput={skuId:string;quantity:string};
async function call<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/control/v1/commerce/storefront/'+path,{
  cache:'no-store',method:body===undefined?'GET':'POST',
  ...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)}),
 });
 const payload=await response.json().catch(()=>null) as {data?:T;message?:string}|null;
 if(!response.ok)throw new Error(response.status===401?'登录已过期':response.status===403?'当前账号没有价格或订单草稿操作权限':payload?.message||'操作失败');
 if(!payload||!('data' in payload))throw new Error('订单 API 返回格式异常');
 return payload.data as T;
}
async function callProduction<T>(orderId:string,body:unknown):Promise<T>{
 const response=await fetch('/api/control/v1/production/orders/from-storefront/'+orderId,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>null) as {data?:T;message?:string}|null;
 if(!response.ok)throw new Error(response.status===401?'登录已过期':response.status===403?'当前账号没有从销售订单创建生产需求的权限':payload?.message||'创建生产需求失败');
 if(!payload||!('data' in payload))throw new Error('生产需求 API 返回格式异常');
 return payload.data as T;
}
const newItem=(skuId=''):ItemInput=>({skuId,quantity:'1'});
export function StorefrontOrderDraftPanel(){
 const [summary,setSummary]=useState<Summary>({checkoutEnabled:false,skus:[],prices:[],orders:[],factories:[]});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [priceSku,setPriceSku]=useState(''),[priceMarket,setPriceMarket]=useState<'DE'|'AT'>('DE');
 const [pricingTargetStatus,setPricingTargetStatus]=useState<PricingTargetStatus>('default');
 const [gross,setGross]=useState(''),[taxRate,setTaxRate]=useState('');
 const [email,setEmail]=useState(''),[market,setMarket]=useState<'DE'|'AT'>('DE');
 const [factoryId,setFactoryId]=useState('');
 const [items,setItems]=useState<ItemInput[]>([newItem()]);
 const [cancelReason,setCancelReason]=useState('');
 const [orderSearch,setOrderSearch]=useState('');
 const [orderStatus,setOrderStatus]=useState('ALL');
 const [orderMarket,setOrderMarket]=useState('ALL');
 const [detail,setDetail]=useState<OrderDetail|null>(null);
 const requestKey=useRef<{fingerprint:string;id:string}|null>(null);
 const refresh=useCallback(async()=>{const data=await call<Summary>('summary');setSummary(data);
  setPriceSku(current=>data.skus.some(s=>s.id===current)?current:(data.skus[0]?.id??''));
  setItems(current=>current.map(line=>({skuId:line.skuId||data.skus[0]?.id||'',quantity:line.quantity})));
  setFactoryId(current=>data.factories.some(f=>f.id===current)?current:(data.factories[0]?.id??''));
 },[]);
 useEffect(()=>{let live=true;void call<Summary>('summary').then(data=>{
  if(live){
   const params=new URLSearchParams(window.location.search);
   const target=resolveAdminPricingTarget(data.skus,window.location.search);
   setSummary(data);setPriceSku(target.skuId);setPriceMarket(target.market);setPricingTargetStatus(target.status);
   const requestedOrder=params.get('orderSearch');
   if(requestedOrder)setOrderSearch(requestedOrder.slice(0,100));
   setItems([newItem(data.skus[0]?.id??'')]);setFactoryId(data.factories[0]?.id??'');
  }
 }).catch(e=>{if(live)setError(e instanceof Error?e.message:'无法读取第一方订单数据');})
  .finally(()=>{if(live)setLoading(false);});return()=>{live=false};},[]);
 const activePrices=summary.prices.filter(p=>p.status==='ACTIVE');
 const availableSkus=summary.skus.filter(s=>activePrices.some(p=>p.skuId===s.id&&p.marketCountry===market));
 const canAddLine=availableSkus.some(s=>!items.some(line=>line.skuId===s.id));
 const selectedPricingSku=summary.skus.find(s=>s.id===priceSku);
 const filteredOrders=filterStorefrontOrders(summary.orders,{query:orderSearch,status:orderStatus,market:orderMarket});
 async function run(action:()=>Promise<unknown>,success:string){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const result=await action();setNotice(typeof result==='string'?result:success);
   try{await refresh();}catch(e){setError('操作已完成，但列表刷新失败：'+(e instanceof Error?e.message:'未知错误')+'。请重新加载页面核对，不要重复提交。');}
  }catch(e){setError(e instanceof Error?e.message:'操作未确认成功，请检查数据后重试');}
  finally{setBusy(false);}
 }
 async function createPrice(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  await run(async()=>{await call<Price>('prices',{skuId:priceSku,marketCountry:priceMarket,unitPriceGross:gross.trim(),taxRateBasisPoints:Number(taxRate)});setGross('');setTaxRate('');},
   '价格草稿已保存。必须人工启用；启用后的价格不可编辑，只能退役后新建版本。');
 }
 async function changePrice(price:Price,action:'activate'|'retire'){
  await run(()=>call<Price>('prices/'+price.id+'/'+action,{expectedVersion:price.version}),
   action==='activate'?'价格版本已启用。该税率仍是管理员配置值，不代表已通过正式结账合规审核。':'价格版本已退役，已创建的订单价格快照不会改变。');
 }
 async function createOrder(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const payload={customerEmail:email.trim().toLowerCase(),marketCountry:market,
   items:items.map(line=>({skuId:line.skuId,quantity:Number(line.quantity)}))};
  const fingerprint=JSON.stringify(payload);
  const clientRequestId=requestKey.current?.fingerprint===fingerprint?requestKey.current.id:crypto.randomUUID();
  requestKey.current={fingerprint,id:clientRequestId};
  await run(async()=>{const order=await call<Order>('orders',{...payload,clientRequestId});
   requestKey.current=null;setEmail('');setItems([newItem(availableSkus[0]?.id??'')]);
   return '已保存内部草稿 '+order.orderNumber+'，总额 '+order.totalGrossAmount+' EUR；未收款、未提交给客户、不会自动转生产。';},
   '订单草稿已保存。');
 }
 async function createProductionDemand(order:Order){
  await run(async()=>{
   const created=await callProduction<Array<{production_order_number:string}>>(order.id,{factoryPartnerId:factoryId});
   return `生产需求已核对：${created.length} 个生产单，${created.map(x=>x.production_order_number).join('、')}。生产单仍需生产负责人单独审核/释放。`;
  },'生产需求已处理。');
 }
 async function cancelOrder(order:Order){
  await run(()=>call<Order>('orders/'+order.id+'/cancel',{expectedVersion:order.version,reason:cancelReason.trim()}),
   '内部订单草稿已取消；没有发生资金操作。');
 }
 async function openDetail(order:Order){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{setDetail(await call<OrderDetail>('orders/'+order.id));}
  catch(e){setError(e instanceof Error?e.message:'无法读取订单详情');}
  finally{setBusy(false);}
 }
 async function submitOrder(order:Order){
  await run(async()=>{
   const updated=await call<Order>('orders/'+order.id+'/submit',{expectedVersion:order.version});
   setDetail(current=>current&&current.id===order.id?{...current,...updated}:current);
   return '订单 '+updated.orderNumber+' 已提交，等待支付通道接入；尚未发起任何支付尝试，也没有资金变动。';
  },'订单已提交。');
 }
 return <section id="b2c" className={styles.firstPartyCard} aria-label="ALSVID 第一方订单与价格管理">
  <div className={styles.firstPartyHeader}>
   <div><span className={styles.eyebrow}>ALSVID OWNED COMMERCE / 第一方商城</span><h2>自建商城订单与价格</h2>
    <p>与 Shopify 等外部订单分开保存。此处只创建内部订单草稿；目前没有公开结账、收款、库存预留或自动生产。</p></div>
   <span className={styles.releaseBadge}>客户结账未开放</span>
  </div>
  <div className={styles.firstPartyNotice}>正式上线前必须由负责人确认德国/奥地利税务与消费者条款，并接入真实 PSP。此价格表中的含税价和税率均为管理员配置数据，不构成税务合规核验。</div>
  {loading?<p role="status">正在读取价格和订单…</p>:null}
  {error?<p className={styles.notice} role="alert">{error}</p>:null}
  {notice?<p className={styles.notice} role="status">{notice}</p>:null}
  <div className={styles.firstPartyGrid}>
   <div className={styles.firstPartyPanel}>
    <h3>① 配置商品价格</h3>
    <p>只允许有效商品 SKU。DE/AT 分别维护 EUR 含税价与税率；先保存草稿，再单独启用。</p>
    {pricingTargetStatus==='selected'&&selectedPricingSku?<p className={styles.firstPartyNotice} role="status">已定位产品中心的 SKU：<strong>{selectedPricingSku.sku}</strong>。请核对市场与含税价格后再保存。</p>:null}
    {pricingTargetStatus==='missing'?<p className={styles.firstPartyNotice} role="alert">链接指定的 SKU 不在当前可管理的商品列表中。未自动选择其他商品，请先确认 SKU 状态和权限。</p>:null}
    <form className={styles.firstPartyForm} onSubmit={e=>{void createPrice(e);}}>
     <label>商品 SKU<select value={priceSku} onChange={e=>{setPriceSku(e.target.value);setPricingTargetStatus('default');}} required disabled={busy||!summary.skus.length}>
      <option value="" disabled>选择要配置价格的 SKU</option>
      {summary.skus.map(s=><option key={s.id} value={s.id}>{s.sku} · {s.name}{s.colorCode?' · '+s.colorCode:''}</option>)}
     </select></label>
     <label>销售市场<select value={priceMarket} onChange={e=>setPriceMarket(e.target.value as 'DE'|'AT')} disabled={busy}>
      <option value="DE">德国 DE</option><option value="AT">奥地利 AT</option>
     </select></label>
     <label>EUR 含税单价<input value={gross} onChange={e=>setGross(e.target.value)} inputMode="decimal" placeholder="例如 2499.00" required disabled={busy}/></label>
     <label>税率（基点）<input value={taxRate} onChange={e=>setTaxRate(e.target.value)} inputMode="numeric" placeholder="例如 1900 = 19%" required disabled={busy}/></label>
     <button type="submit" disabled={busy||!priceSku||!gross.trim()||!taxRate.trim()}>保存价格草稿</button>
    </form>
    <div className={styles.firstPartyListHead}>价格版本（{summary.prices.length}）</div>
    {summary.prices.slice(0,30).map(p=><article className={styles.firstPartyRow} key={p.id}>
     <div><strong>{p.sku} · {p.marketCountry}</strong><span>{p.unitPriceGross} EUR 含税 · 税率 {p.taxRateBasisPoints/100}% · V{p.version}</span>
      <small>{p.status==='ACTIVE'?'已启用':p.status==='DRAFT'?'草稿':'已退役'}</small></div>
     <div className={styles.firstPartyActions}>
      {p.status==='DRAFT'?<button type="button" disabled={busy} onClick={()=>void changePrice(p,'activate')}>启用</button>:null}
      {p.status==='ACTIVE'?<button type="button" className={styles.secondaryAction} disabled={busy} onClick={()=>void changePrice(p,'retire')}>退役</button>:null}
     </div>
    </article>)}
    {!summary.prices.length?<p className={styles.firstPartyEmpty}>尚未配置价格。请先选择 SKU 并保存价格草稿。</p>:null}
   </div>
   <div className={styles.firstPartyPanel}>
    <h3>② 创建内部订单草稿</h3>
    <p>服务端只读取已启用价格并重新计算金额。重复提交使用请求 ID 去重。草稿不会发起支付。</p>
    <form className={styles.firstPartyForm} onSubmit={e=>{void createOrder(e);}}>
     <label>客户邮箱<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="customer@example.com" disabled={busy}/></label>
     <label>销售市场<select value={market} onChange={e=>{const next=e.target.value as 'DE'|'AT';setMarket(next);const options=activePrices.filter(p=>p.marketCountry===next);setItems(old=>old.map((line,i)=>({skuId:options.some(p=>p.skuId===line.skuId)?line.skuId:(i===0?options[0]?.skuId??'':''),quantity:line.quantity})));}} disabled={busy}>
      <option value="DE">德国 DE</option><option value="AT">奥地利 AT</option>
     </select></label>
     <div className={styles.firstPartyListHead}>订单商品（{items.length}/25）</div>
     {items.map((line,i)=><div className={styles.firstPartyItem} key={i}>
      <label>商品<select value={line.skuId} onChange={e=>setItems(old=>old.map((x,j)=>j===i?{...x,skuId:e.target.value}:x))} required disabled={busy||!availableSkus.length}>
       {availableSkus.map(s=><option key={s.id} value={s.id}>{s.sku} · {s.name}{s.colorCode?' · '+s.colorCode:''}</option>)}
      </select></label>
      <label>数量<input type="number" min="1" max="1000" step="1" value={line.quantity} onChange={e=>setItems(old=>old.map((x,j)=>j===i?{...x,quantity:e.target.value}:x))} required disabled={busy}/></label>
      {items.length>1?<button type="button" className={styles.secondaryAction} disabled={busy} onClick={()=>setItems(old=>old.filter((_,j)=>j!==i))}>移除</button>:null}
     </div>)}
     <div className={styles.firstPartyInline}>
      <button type="button" className={styles.secondaryAction} disabled={busy||items.length>=25||!canAddLine} onClick={()=>setItems(old=>[...old,newItem(availableSkus.find(s=>!old.some(x=>x.skuId===s.id))?.id??'')])}>添加商品行</button>
      <button type="submit" disabled={busy||!email.trim()||!availableSkus.length||items.some(x=>!x.skuId||!/^\d+$/.test(x.quantity)||Number(x.quantity)<1||Number(x.quantity)>1000)}>创建草稿（不收款）</button>
     </div>
    </form>
    {!availableSkus.length?<p className={styles.firstPartyEmpty}>该市场没有已启用价格的 SKU。先配置并启用对应市场价格，才可建立草稿。</p>:null}
    <div className={styles.firstPartyListHead}>已加载第一方订单（{summary.orders.length}）</div>
     <div className={styles.firstPartyFilters} role="group" aria-label="筛选第一方订单">
      <label>订单号 / 客户邮箱 / SKU
       <input type="search" value={orderSearch} onChange={event=>setOrderSearch(event.target.value)} placeholder="查找已加载的订单" />
      </label>
      <label>订单状态
       <select value={orderStatus} onChange={event=>setOrderStatus(event.target.value)}>
        <option value="ALL">全部状态</option>
        <option value="DRAFT">内部草稿</option>
        <option value="CANCELLED">已取消</option>
        <option value="PAYMENT_VERIFIED">已核验付款</option>
        <option value="FULFILLMENT_PENDING">待履约</option>
        <option value="IN_PRODUCTION">生产中</option>
       </select>
      </label>
      <label>销售市场
       <select value={orderMarket} onChange={event=>setOrderMarket(event.target.value)}>
        <option value="ALL">全部市场</option><option value="DE">德国 DE</option><option value="AT">奥地利 AT</option>
       </select>
      </label>
     </div>
     <p className={styles.firstPartyEmpty} role="status" aria-live="polite">符合条件 {filteredOrders.length} 条，显示前 {Math.min(filteredOrders.length,30)} 条。仅筛选当前 API 已加载的订单。</p>
    <label className={styles.cancelReasonField}>生产工厂（仅已核验订单可生成生产需求）
     <select value={factoryId} onChange={e=>setFactoryId(e.target.value)} disabled={busy||!summary.factories.length}>
      {summary.factories.map(f=><option key={f.id} value={f.id}>{f.code} · {f.name}</option>)}
     </select>
    </label>
    <label className={styles.cancelReasonField}>取消原因（至少 10 个字符）
     <input value={cancelReason} onChange={e=>setCancelReason(e.target.value)} minLength={10} maxLength={500} placeholder="例如：客户信息录入错误，重新建立订单" disabled={busy}/>
    </label>
    {filteredOrders.slice(0,30).map(o=><article className={styles.firstPartyRow} key={o.id}>
     <div><strong>{o.orderNumber} · {o.totalGrossAmount} {o.currency}</strong>
      <span>{o.customerEmail} · {o.marketCountry} · {o.lines.map(l=>l.skuCode+' × '+l.quantity).join('，')}</span>
      <small>{orderStatusLabel(o.status)} · 支付：{o.paymentStatus==='NOT_CONFIGURED'?'未配置':o.paymentStatus}</small>
      {o.status==='DRAFT'?<small>生产门槛未通过：尚无已核验付款证据。</small>:null}
      {o.status==='SUBMITTED'?<small>已提交待支付：支付通道尚未接入，订单无法继续流转。</small>:null}
     </div>
     <div className={styles.firstPartyActions}>
      {['PAYMENT_VERIFIED','FULFILLMENT_PENDING','IN_PRODUCTION'].includes(o.status)?<button type="button" disabled={busy||!factoryId} onClick={()=>void createProductionDemand(o)}>创建 / 核对生产需求</button>:null}
      {o.status==='DRAFT'?<button type="button" disabled={busy} onClick={()=>void submitOrder(o)}>提交订单</button>:null}
      {o.status==='DRAFT'?<button type="button" className={styles.secondaryAction} disabled={busy||cancelReason.trim().length<10} onClick={()=>void cancelOrder(o)}>取消草稿</button>:null}
      <button type="button" className={styles.secondaryAction} disabled={busy} onClick={()=>void openDetail(o)}>详情</button>
     </div>
    </article>)}
    {!loading&&!summary.orders.length&&!error?<p className={styles.firstPartyEmpty}>尚无第一方订单记录。</p>:null}
     {summary.orders.length>0&&!filteredOrders.length?<p className={styles.firstPartyEmpty}>没有符合当前筛选条件的订单，可调整搜索或筛选项。</p>:null}
     {detail?<section className={styles.firstPartyRow} aria-label="订单详情">
      <div>
       <strong>{detail.orderNumber} · {detail.totalGrossAmount} {detail.currency}</strong>
       <span>{detail.customerEmail} · {detail.marketCountry} · 状态：{orderStatusLabel(detail.status)} · 支付：{detail.paymentStatus==='NOT_CONFIGURED'?'未配置':detail.paymentStatus}</span>
       <small>版本 V{detail.version} · 净额 {detail.totalNetAmount} + 税额 {detail.totalTaxAmount} = 含税 {detail.totalGrossAmount} {detail.currency}</small>
       <small>创建时间 {new Date(detail.createdAt).toLocaleString('zh-CN')}</small>
       <small>订单行（{detail.lines.length}）</small>
       <ul>
        {detail.lines.map(line=><li key={line.id}>{line.skuCode} · {line.skuName}{line.colorCode?' · '+line.colorCode:''} × {line.quantity} — 含税 {line.lineGrossAmount}（净 {line.lineNetAmount} + 税 {line.lineTaxAmount}），税率 {line.taxRateBasisPoints/100}%</li>)}
       </ul>
       <small>流转记录（{detail.events.length}）</small>
       <ul>
        {detail.events.map(event=><li key={event.id}>{new Date(event.occurredAt).toLocaleString('zh-CN')} · {event.eventType} · {event.fromStatus?orderStatusLabel(event.fromStatus)+' → ':''}{orderStatusLabel(event.toStatus)} · 支付 {event.toPaymentStatus}</li>)}
       </ul>
       {detail.blockers.length?<small>阻塞项：{detail.blockers.join('；')}</small>:null}
      </div>
      <div className={styles.firstPartyActions}>
       <button type="button" className={styles.secondaryAction} disabled={busy} onClick={()=>setDetail(null)}>收起详情</button>
      </div>
     </section>:null}
   </div>
  </div>
  <p className={styles.firstPartyFooter}>安全边界：所有新建订单初始状态为 DRAFT / NOT_CONFIGURED；界面和 API 都不提供“手动标记已付款”。数据库要求已核验 PSP 交易、签名验证、订单金额与币种完全匹配，才允许将订单转为已付款。生产单若关联销售订单行，还必须匹配已发布 BOM、SKU 与数量；否则数据库拒绝。</p>
 </section>;
}
