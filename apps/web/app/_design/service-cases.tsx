'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from './admin-records.module.css';

type CaseStatus = 'NEW'|'TRIAGED'|'IN_PROGRESS'|'RESOLVED'|'CLOSED';
type CaseCategory = 'ISSUE'|'WARRANTY_REVIEW'|'REPAIR_REQUEST';
type CaseRow = {
 id:string;caseNumber:string;vehicleId:string;frameNumber:string;sku:string;
 title:string;description:string;category:CaseCategory;status:CaseStatus;version:number;
 createdAt:string;updatedAt:string;
};
type VehicleRow = { id:string;frame_number:string;sku:string };
type HistoryRow = { id:string;caseVersion:number;fromStatus:CaseStatus|null;toStatus:CaseStatus;reason:string;occurredAt:string;actorUserId:string };
const states:Record<CaseStatus,string> = { NEW:'待受理',TRIAGED:'已分诊',IN_PROGRESS:'处理中',RESOLVED:'已解决（待确认）',CLOSED:'已关闭' };
const categories:Record<CaseCategory,string> = {ISSUE:'车辆问题',WARRANTY_REVIEW:'保修待审核',REPAIR_REQUEST:'维修申请'};
const nextStatus:Record<CaseStatus,CaseStatus[]> = {NEW:['TRIAGED'],TRIAGED:['IN_PROGRESS'],IN_PROGRESS:['RESOLVED'],RESOLVED:['IN_PROGRESS','CLOSED'],CLOSED:[]};

async function api<T>(path:string,method='GET',body?:unknown):Promise<T> {
 const response=await fetch('/api/control'+path,{
  method,
  cache:'no-store',
  ...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)}),
 });
 const payload:unknown=await response.json().catch(()=>null);
 if(!response.ok){
  const message=payload&&typeof payload==='object'&&'message' in payload && typeof payload.message==='string'?payload.message:'请求未成功';
  if(response.status===403)throw new Error('当前账号没有售后权限；'+message);
  if(response.status===401)throw new Error('登录已过期，请重新登录');
  if(response.status===409)throw new Error('工单状态已变化，请刷新后重试；'+message);
  throw new Error(message);
 }
 if(!payload||typeof payload!=='object'||!('data' in payload))throw new Error('业务接口返回格式异常');
 return payload.data as T;
}

function occurred(value:string){const n=Date.parse(value);return Number.isNaN(n)?'—':new Date(n).toLocaleString('zh-CN',{hour12:false});}

export function ServiceCaseClient() {
 const [cases,setCases]=useState<CaseRow[]>([]);
 const [vehicles,setVehicles]=useState<VehicleRow[]>([]);
 const [selected,setSelected]=useState('');
 const [detail,setDetail]=useState<{case:CaseRow;history:HistoryRow[]}|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [message,setMessage]=useState('');
 const [actionMessage,setActionMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const [reason,setReason]=useState('');
 const [target,setTarget]=useState<CaseStatus>('TRIAGED');
 const [readAt,setReadAt]=useState('');

 async function reload() {
  setStatus('loading');setMessage('');
  try {
   const [rows,vehicleRows]=await Promise.all([api<CaseRow[]>('/v1/service/cases'),api<VehicleRow[]>('/v1/vehicles')]);
   if(!Array.isArray(rows)||!Array.isArray(vehicleRows))throw new Error('接口未返回可用的记录列表');
   setCases(rows);setVehicles(vehicleRows);setStatus('ready');
   setReadAt(new Date().toLocaleString('zh-CN',{hour12:false}));
  }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'读取失败');}
 }
 useEffect(()=>{void reload();},[]);
 useEffect(()=>{
  if(!selected){setDetail(null);return;}
  let active=true;setDetail(null);setMessage('');
  void api<{case:CaseRow;history:HistoryRow[]}>('/v1/service/cases/'+encodeURIComponent(selected))
    .then(data=>{if(active){setDetail(data);setTarget(nextStatus[data.case.status][0]??'TRIAGED');setReason('');}})
    .catch(error=>{if(active)setMessage(error instanceof Error?error.message:'读取工单明细失败');});
  return()=>{active=false;};
 },[selected]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const form=new FormData(event.currentTarget);
  const vehicleId=String(form.get('vehicleId')??'');
  const category=String(form.get('category')??'ISSUE') as CaseCategory;
  const title=String(form.get('title')??'').trim();
  const description=String(form.get('description')??'').trim();
  if(!vehicleId||title.length<5){setActionMessage('必须选择已经出生的车辆，问题标题不少于五个字');return;}
  setBusy(true);setActionMessage('');
  try {
   const created=await api<CaseRow>('/v1/service/cases','POST',{vehicleId,category,title,description});
   setActionMessage('已保存真实工单 '+created.caseNumber);
   event.currentTarget.reset();
   await reload();setSelected(created.id);
  }catch(error){setActionMessage(error instanceof Error?error.message:'工单创建失败');}
  finally{setBusy(false);}
 }

 async function changeStatus(){
  if(!detail||!reason.trim()||busy)return;
  setBusy(true);setActionMessage('');
  try {
   await api('/v1/service/cases/'+encodeURIComponent(detail.case.id)+'/transition','POST',{
    expectedVersion:detail.case.version,toStatus:target,reason:reason.trim(),
   });
   const refreshed=await api<{case:CaseRow;history:HistoryRow[]}>('/v1/service/cases/'+encodeURIComponent(detail.case.id));
   setDetail(refreshed);setCases(current=>current.map(c=>c.id===refreshed.case.id?refreshed.case:c));
   setTarget(nextStatus[refreshed.case.status][0]??'TRIAGED');setReason('');
   setActionMessage('状态更新已保存到历史与审计');
  }catch(error){setActionMessage(error instanceof Error?error.message:'状态更新失败');}
  finally{setBusy(false);}
 }

 return <div className={styles.stack}>
  <section className="av-card">
   <div className={styles.heading}>
    <div>
     <h2 className="av-cardtitle">售后工单 · 真实操作</h2>
     <p className={styles.muted}>仅 ALSVID 内部授权员工可操作；不自动判定保修、不发起配件扣减、不关联未经验证的客户所有权。</p>
    </div>
    <button type="button" className="av-btn" disabled={busy||status==='loading'} onClick={()=>{void reload();}}>刷新工单</button>
   </div>
   <p className={styles.muted}>最近读取：{readAt||'尚未读取'}；最多展示最新 200 条工单。</p>
   {status==='loading'?<p role="status">正在读取真实售后记录…</p>:status==='error'?<p role="alert" className={styles.error}>{message}（不能将失败视作 0 条）</p>:<>
    {cases.length?<div className={styles.tableScroll}>
     <table className={styles.table}>
      <thead><tr><th>工单号</th><th>车辆</th><th>分类 / 标题</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>{cases.map(c=><tr key={c.id}>
       <td>{c.caseNumber}</td><td>{c.frameNumber} · {c.sku}</td><td>{categories[c.category]} · {c.title}</td>
       <td>{states[c.status]}</td><td><button type="button" className={styles.linkButton} onClick={()=>setSelected(c.id)}>查看 / 处理</button></td>
      </tr>)}</tbody>
     </table>
    </div>:<p className={styles.notice}>没有已保存的真实售后工单</p>}
   </>}
  </section>

  <section className="av-card">
   <h2 className="av-cardtitle">创建售后受理记录</h2>
   <p className={styles.muted}>必须先通过真实生产和质检生成 Vehicle 记录。此入口只创建内部问题记录，保修范围需要后续人工审核。</p>
   <form onSubmit={event=>{void submit(event);}} className={styles.stack}>
    <label>关联车辆（车架号 / SKU）
     <select name="vehicleId" required disabled={busy||status!=='ready'} className={styles.search} defaultValue="">
      <option value="">请选择真实车辆</option>
      {vehicles.map(v=><option key={v.id} value={v.id}>{v.frame_number} · {v.sku}</option>)}
     </select>
    </label>
    <label>业务分类
     <select name="category" className={styles.search} defaultValue="ISSUE">
      <option value="ISSUE">车辆问题</option><option value="WARRANTY_REVIEW">保修待审核</option><option value="REPAIR_REQUEST">维修申请</option>
     </select>
    </label>
    <label>问题标题<input name="title" minLength={5} maxLength={160} required className={styles.search} placeholder="例如：刹车异响需要检查" /></label>
    <label>情况说明<textarea name="description" maxLength={4000} rows={3} className={styles.search} placeholder="记录问题现象，不填写不必要的个人隐私" /></label>
    <div><button className="av-btn" type="submit" disabled={busy||status!=='ready'||!vehicles.length}>{busy?'保存中…':'创建工单并保存'}</button></div>
   </form>
  </section>

  {selected?<section className="av-card">
   <div className={styles.heading}><h2 className="av-cardtitle">工单详情与处理记录</h2>
    <button className="av-btn" type="button" onClick={()=>setSelected('')}>关闭详情</button></div>
   {message?<p role="alert" className={styles.error}>{message}</p>:null}
   {!detail?<p>正在读取详情…</p>:<>
    <p><strong>{detail.case.caseNumber}</strong> · {detail.case.frameNumber} · {states[detail.case.status]} · 版本 {detail.case.version}</p>
    <p>{detail.case.title}</p><p className={styles.muted}>{detail.case.description||'没有额外说明'}</p>
    {nextStatus[detail.case.status].length?<div className={styles.stack}>
     <label>下一业务状态<select className={styles.search} value={target} onChange={event=>setTarget(event.target.value as CaseStatus)}>
      {nextStatus[detail.case.status].map(state=><option key={state} value={state}>{states[state]}</option>)}
     </select></label>
     <label>处理原因（必填）<textarea className={styles.search} minLength={3} maxLength={1000} rows={2} required value={reason} onChange={event=>setReason(event.target.value)} /></label>
     <div><button className="av-btn" type="button" disabled={busy||reason.trim().length<3} onClick={()=>{void changeStatus();}}>保存处理结果</button></div>
    </div>:<p className={styles.notice}>工单已关闭；不能再执行其他状态变更。</p>}
    <h3>不可变处理历史</h3>
    <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>版本 / 时间</th><th>状态</th><th>原因</th><th>操作者 ID</th></tr></thead>
     <tbody>{detail.history.map(h=><tr key={h.id}><td>v{h.caseVersion} · {occurred(h.occurredAt)}</td><td>{h.fromStatus?states[h.fromStatus]+' → ':''}{states[h.toStatus]}</td><td>{h.reason}</td><td>{h.actorUserId}</td></tr>)}</tbody>
    </table></div>
   </>}
  </section>:null}
  {actionMessage?<p className={actionMessage.startsWith('已')||actionMessage.startsWith('状态更新')?styles.notice:styles.error} role="status">{actionMessage}</p>:null}
 </div>;
}
