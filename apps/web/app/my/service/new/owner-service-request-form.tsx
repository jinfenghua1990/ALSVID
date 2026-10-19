'use client';

import { useRef,useState,type FormEvent } from 'react';
import Link from 'next/link';
import styles from '../../owner-portal.module.css';

type OwnedVehicle={id:string;model:string;frameNumber:string};
type Kind='ISSUE'|'REPAIR_REQUEST'|'WARRANTY_REVIEW';
type Result={id:string;caseNumber:string;vehicleId:string;status:'NEW'};
const categories:Record<Kind,string>={
 ISSUE:'车辆 / 产品问题',REPAIR_REQUEST:'维修服务申请',WARRANTY_REVIEW:'保修资格审核申请'
};
export function OwnerServiceRequestForm({vehicles,preselected}:{vehicles:OwnedVehicle[];preselected:string}) {
 const [vehicleId,setVehicleId]=useState(vehicles.some(x=>x.id===preselected)?preselected:vehicles[0]?.id??'');
 const [category,setCategory]=useState<Kind>('ISSUE');
 const [title,setTitle]=useState('');
 const [description,setDescription]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [created,setCreated]=useState<Result|null>(null);
 const retry=useRef<{fingerprint:string;requestId:string}|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||created)return;
  if(!vehicles.some(v=>v.id===vehicleId)){setError('请选择已核验并属于当前账号的车辆');return;}
  const actualTitle=title.trim(),actualDescription=description.trim();
  if(actualTitle.length<5||actualTitle.length>160||actualDescription.length>4000){setError('请填写有效问题标题和说明');return;}
  const body={vehicleId,category,title:actualTitle,description:actualDescription};
  const fingerprint=JSON.stringify(body);
  const clientRequestId=retry.current?.fingerprint===fingerprint?retry.current.requestId:crypto.randomUUID();
  retry.current={fingerprint,requestId:clientRequestId};
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/control/v1/my/service/cases',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,clientRequestId}),
    cache:'no-store',
   });
   const result=await response.json().catch(()=>null) as {data?:Result;message?:string}|null;
   if(!response.ok){
    if(response.status===401)throw new Error('登录已过期，请重新登录后操作');
    if(response.status===403||response.status===404)throw new Error('这台车辆不属于当前已核验车库，无法提交售后');
    if(response.status===409)throw new Error('此次申请已存在或与原内容冲突，请核对并重试');
    throw new Error(result?.message??'售后申请未能保存，请保留填写内容重试');
   }
   if(!result?.data?.id||!result.data.caseNumber)throw new Error('服务端响应不完整；可能已保存，请保持原表单再次提交以防重复');
   setCreated(result.data);
   retry.current=null;
  }catch(e){setError(e instanceof Error?e.message:'提交失败，请核对网络后重试');}
  finally{setBusy(false);}
 }
 if(!vehicles.length)return <div className={styles.notice}>
  当前没有已核验的归属车辆，不能提交售后。只有管理员核实交付后，车辆才会出现在你的车库。
  <p><Link href="/my/vehicles">返回我的车库</Link></p>
 </div>;
 if(created)return <div className={styles.notice} role="status">
  <h2>售后工单已保存</h2>
  <p>工单编号：<strong>{created.caseNumber}</strong>。状态：待受理。此记录已进入 ALSVID Admin 内部售后工作台。</p>
  <p>保修是否适用仍需审核；此处不承诺免费维修或配件费用。</p>
  <Link className={styles.primaryAction} href="/my/service">查看我的售后进度</Link>
 </div>;
 return <form className={styles.form} onSubmit={event=>{void submit(event);}}>
  <div className={styles.field}>
   <label htmlFor="owner-case-vehicle">申请车辆</label>
   <select id="owner-case-vehicle" value={vehicleId} onChange={e=>setVehicleId(e.target.value)} required disabled={busy}>
    {vehicles.map(v=><option key={v.id} value={v.id}>{v.model} · {v.frameNumber}</option>)}
   </select>
   <small>只能为当前账号已获得所有权访问许可的车辆申请。</small>
  </div>
  <div className={styles.field}>
   <label htmlFor="owner-case-kind">问题类别</label>
   <select id="owner-case-kind" value={category} disabled={busy} onChange={e=>setCategory(e.target.value as Kind)}>
    {(Object.keys(categories) as Kind[]).map(kind=><option key={kind} value={kind}>{categories[kind]}</option>)}
   </select>
  </div>
  <div className={styles.field}>
   <label htmlFor="owner-case-title">问题标题</label>
   <input id="owner-case-title" value={title} minLength={5} maxLength={160} required disabled={busy}
    onChange={e=>setTitle(e.target.value)} placeholder="例如：前刹车出现异常摩擦声"/>
  </div>
  <div className={styles.field}>
   <label htmlFor="owner-case-description">具体问题与发生时间</label>
   <textarea id="owner-case-description" value={description} maxLength={4000} rows={5} disabled={busy}
    onChange={e=>setDescription(e.target.value)} placeholder="描述车辆问题及出现条件，不需填写无关隐私信息" />
   <small>照片和维修附件仍待专属授权存储接口接入，不会假装上传成功。</small>
  </div>
  <button className={styles.primaryAction} type="submit" disabled={busy||!vehicleId||title.trim().length<5}>
   {busy?'提交中…':'提交售后申请'}
  </button>
  <p className={styles.subtle}>本次提交会真实创建工单，并进入内部人工处理流程；保修资格不自动批准。</p>
  {error?<p role="alert" className={styles.notice}>{error}</p>:null}
 </form>;
}
