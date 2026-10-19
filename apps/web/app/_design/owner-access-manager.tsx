'use client';
import {useEffect,useState,type FormEvent} from 'react';
import styles from './admin-records.module.css';

type VehicleOption={id:string;frame_number:string;sku:string};
type CustomerAccount={userId:string;email:string;displayName:string;roles:string[];status:string};
type OwnerAccess={vehicleId:string;status:'GRANTED'|'REVOKED'|'UNASSIGNED';customerUserId:string|null};
async function call<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const r=await fetch('/api/control'+path,{method,cache:'no-store',...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 const j=await r.json().catch(()=>null) as {data?:T;message?:string}|null;
 if(!r.ok){
  if(r.status===401)throw new Error('管理员登录已过期，请重新登录');
  if(r.status===403)throw new Error('没有车主绑定或身份目录的操作权限');
  if(r.status===409)throw new Error('车辆绑定关系发生冲突，请刷新核对');
  throw new Error(j?.message??'服务器拒绝此请求');
 }
 if(!j||!('data' in j))throw new Error('授权接口响应异常');
 return j.data as T;
}
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function OwnerAccessManager({vehicles}:{vehicles:VehicleOption[]}){
 const [vehicleId,setVehicleId]=useState('');
 const [customers,setCustomers]=useState<CustomerAccount[]>([]);
 const [selectedCustomer,setSelectedCustomer]=useState('');
 const [evidence,setEvidence]=useState('');
 const [attested,setAttested]=useState(false);
 const [owner,setOwner]=useState<OwnerAccess|null>(null);
 const [state,setState]=useState<'idle'|'loading'|'ready'|'failed'>('idle');
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);

 useEffect(()=>{
  let alive=true;
  void call<CustomerAccount[]>('/v1/auth/users').then(rows=>{if(alive&&Array.isArray(rows))setCustomers(rows.filter(c=>c.roles.includes('customer_user')&&c.status==='ACTIVE'));})
  .catch(()=>{if(alive)setMessage('无法加载用户目录：需要身份读取权限；不会尝试按邮箱自动匹配车主。');});
  return ()=>{alive=false};
 },[]);
 useEffect(()=>{
  if(!vehicleId){setOwner(null);setState('idle');return;}
  let alive=true;setState('loading');setOwner(null);setMessage('');
  void call<OwnerAccess>('/v1/vehicles/'+encodeURIComponent(vehicleId)+'/owner-access')
   .then(row=>{if(alive){setOwner(row);setState('ready');}})
   .catch(e=>{if(alive){setMessage(e instanceof Error?e.message:'读取失败');setState('failed');}});
  return ()=>{alive=false};
 },[vehicleId]);
 async function refresh(){
  if(!vehicleId)return;
  const response=await call<OwnerAccess>('/v1/vehicles/'+encodeURIComponent(vehicleId)+'/owner-access');
  setOwner(response);setState('ready');
 }
 async function submit(event:FormEvent<HTMLFormElement>,kind:'grant'|'revoke'){
  event.preventDefault();if(saving||!vehicleId||!attested)return;
  if(evidence.trim().length<12){setMessage('请提供已经核验的交付或转让证据编号（至少12字符）');return;}
  if(kind==='grant'&&!idPattern.test(selectedCustomer)){setMessage('请选择真实的客户账户');return;}
  setSaving(true);setMessage('');
  try{
   await call('/v1/vehicles/'+encodeURIComponent(vehicleId)+'/owner-access/'+kind,'POST',
    kind==='grant'?{customerUserId:selectedCustomer,evidenceRef:evidence.trim()}:{evidenceRef:evidence.trim()});
   await refresh();setEvidence('');setAttested(false);
   setMessage(kind==='grant'?'授权已保存。车主需要重新加载 My ALSVID 才能查看车辆。':'撤销已保存，车主访问已解除。');
  }catch(e){setMessage(e instanceof Error?e.message:'保存失败，未证明有任何车辆访问变更');}
  finally{setSaving(false);}
 }
 return <section className="av-card">
  <div className={styles.heading}><div>
   <h2 className="av-cardtitle">车主交付授权（与 My ALSVID 联动）</h2>
   <p className={styles.muted}>仅限管理员依据已经核验的实际交付或转让证明操作。车架号、邮箱一致或知道 VIN 均不能自动拥有车辆。</p>
  </div></div>
  <div className={styles.stack}>
   <label>已登记车辆
    <select className={styles.search} value={vehicleId} onChange={e=>{setVehicleId(e.target.value);setSelectedCustomer('');setAttested(false);setEvidence('')}}>
     <option value="">选择车辆以核对当前归属</option>
     {vehicles.map(v=><option key={v.id} value={v.id}>{v.frame_number} · {v.sku}</option>)}
    </select>
   </label>
   {state==='loading'?<p role="status">正在查询该车辆的最新授权记录…</p>:null}
   {owner&&state==='ready'?<p className={styles.notice}>
    当前授权状态：{owner.status==='GRANTED'?'已授权':owner.status==='REVOKED'?'已撤销':'尚未授权'}。
    {owner.customerUserId?' 当前车主账户 ID：'+owner.customerUserId:''}
   </p>:null}
   {state==='failed'?<p role="alert" className={styles.error}>授权状态读取失败；禁止继续写入。</p>:null}
   {owner&&state==='ready'?<form className={styles.stack} onSubmit={e=>{void submit(e,owner.status==='GRANTED'?'revoke':'grant')}}>
    {owner.status!=='GRANTED'?<label>目标 My ALSVID 客户账户（已启用）
     <select className={styles.search} required value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}>
      <option value="">选择已有的客户账号；不得凭邮箱自行推断</option>
      {customers.map(c=><option key={c.userId} value={c.userId}>{c.email} · {c.displayName} ({c.userId})</option>)}
     </select>
    </label>:null}
    <label>已审核的交付/所有权证据编号
     <input className={styles.search} value={evidence} minLength={12} maxLength={200} onChange={e=>setEvidence(e.target.value)}
      placeholder="例如 DELIVERY-CONFIRMED-2026-001" required />
    </label>
    <label><input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)}/>
     我已人工核对车辆、交付/转让证明及正确的客户身份；操作将进入不可变审计。
    </label>
    <div><button type="submit" className="av-btn"
     disabled={saving||!attested||evidence.trim().length<12||(owner.status!=='GRANTED'&&!selectedCustomer)}>
     {saving?'提交中…':owner.status==='GRANTED'?'撤销该车主的车库访问':'确认授予此客户的车库访问'}
    </button></div>
   </form>:null}
   {message?<p role="status" className={message.startsWith('授权已')||message.startsWith('撤销已')?styles.notice:styles.error}>{message}</p>:null}
  </div>
 </section>;
}
