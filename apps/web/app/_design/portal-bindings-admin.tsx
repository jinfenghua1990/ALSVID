'use client';
import { useEffect, useState } from 'react';
import styles from './admin-records.module.css';

type User={userId:string;email:string;displayName?:string;roles:string[]};
type Partner={id:string;displayName:string;roles:string[]};
type Vehicle={id:string;frame_number:string};
async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
 const res=await fetch('/api/control'+path,{method,cache:'no-store',
  ...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 const value:unknown=await res.json().catch(()=>null);
 if(!res.ok){
  if(res.status===403)throw new Error('没有此操作的系统管理员权限');
  if(res.status===401)throw new Error('登录过期，请重新登录');
  throw new Error(value&&typeof value==='object'&&'message' in value?String(value.message):'操作失败');
 }
 if(!value||typeof value!=='object'||!('data' in value))throw new Error('返回结果格式异常');
 return value.data as T;
}
export function PortalBindingsAdmin(){
 const [users,setUsers]=useState<User[]>([]);
 const [partners,setPartners]=useState<Partner[]>([]);
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [error,setError]=useState('');
 const [result,setResult]=useState('');
 const [busy,setBusy]=useState(false);
 const [supplierUser,setSupplierUser]=useState('');
 const [supplierPartner,setSupplierPartner]=useState('');
 const [supplierEvidence,setSupplierEvidence]=useState('');
 const [ownerUser,setOwnerUser]=useState('');
 const [ownerVehicle,setOwnerVehicle]=useState('');
 const [ownerEvidence,setOwnerEvidence]=useState('');
 const [supplierAccess,setSupplierAccess]=useState<{status:'ACTIVE'|'DISABLED'|'UNASSIGNED';updatedAt:string|null}|null>(null);
 const [ownerAccess,setOwnerAccess]=useState<{status:'GRANTED'|'REVOKED'|'UNASSIGNED';customerUserId:string|null}|null>(null);
 const [supplierState,setSupplierState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [ownerState,setOwnerState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [supplierAttested,setSupplierAttested]=useState(false);
 const [ownerAttested,setOwnerAttested]=useState(false);
 async function refresh(){
  setStatus('loading');setError('');
  try{
   const [u,p,v]=await Promise.all([request<User[]>('/v1/auth/users'),request<Partner[]>('/v1/partners'),request<Vehicle[]>('/v1/vehicles')]);
   if(!Array.isArray(u)||!Array.isArray(p)||!Array.isArray(v))throw new Error('组织、账号或车辆接口异常');
   setUsers(u);setPartners(p);setVehicles(v);setStatus('ready');
  }catch(e){setStatus('error');setError(e instanceof Error?e.message:'读取失败');}
 }
 useEffect(()=>{void refresh();},[]);
 useEffect(()=>{
  setSupplierAccess(null);setSupplierAttested(false);
  if(!supplierUser||!supplierPartner){setSupplierState('idle');return;}
  let alive=true;setSupplierState('loading');
  void request<{status:'ACTIVE'|'DISABLED'|'UNASSIGNED';updatedAt:string|null}>(
   '/v1/auth/supplier-memberships/'+encodeURIComponent(supplierUser)+'/'+encodeURIComponent(supplierPartner))
   .then(row=>{if(alive){setSupplierAccess(row);setSupplierState('ready');}})
   .catch(e=>{if(alive){setSupplierState('error');setError(e instanceof Error?e.message:'供应商授权读取失败');}});
  return ()=>{alive=false;};
 },[supplierUser,supplierPartner]);
 useEffect(()=>{
  setOwnerAccess(null);setOwnerAttested(false);
  if(!ownerVehicle){setOwnerState('idle');return;}
  let alive=true;setOwnerState('loading');
  void request<{status:'GRANTED'|'REVOKED'|'UNASSIGNED';customerUserId:string|null}>('/v1/vehicles/'+encodeURIComponent(ownerVehicle)+'/owner-access')
   .then(row=>{if(alive){setOwnerAccess(row);setOwnerState('ready');}})
   .catch(e=>{if(alive){setOwnerState('error');setError(e instanceof Error?e.message:'车主授权读取失败');}});
  return ()=>{alive=false;};
 },[ownerVehicle]);
 async function refreshSupplierAccess(){
  const row=await request<{status:'ACTIVE'|'DISABLED'|'UNASSIGNED';updatedAt:string|null}>(
   '/v1/auth/supplier-memberships/'+encodeURIComponent(supplierUser)+'/'+encodeURIComponent(supplierPartner));
  setSupplierAccess(row);setSupplierState('ready');setSupplierAttested(false);
 }
 async function refreshOwnerAccess(){
  const row=await request<{status:'GRANTED'|'REVOKED'|'UNASSIGNED';customerUserId:string|null}>(
   '/v1/vehicles/'+encodeURIComponent(ownerVehicle)+'/owner-access');
  setOwnerAccess(row);setOwnerState('ready');setOwnerAttested(false);
 }
 async function act(work:()=>Promise<unknown>,success:string){
  if(busy)return;setBusy(true);setError('');setResult('');
  try{await work();setResult(success);}
  catch(e){setError(e instanceof Error?e.message:'写入失败');}
  finally{setBusy(false);}
 }
 const supplierPartners=partners.filter(p=>Array.isArray(p.roles)&&(p.roles.includes('SUPPLIER')||p.roles.includes('FACTORY')));
 const customers=users.filter(u=>Array.isArray(u.roles)&&u.roles.includes('customer_user'));
 return <section className="av-card">
  <div className={styles.heading}><div><h2 className="av-cardtitle">跨门户授权与交付核验</h2>
   <p className={styles.muted}>只有系统管理员可保存。绑定以真实用户、Supplier Partner、车辆 ID 为准；邮箱相同、知晓 VIN、登录成功均不构成业务授权。</p>
   </div><button type="button" className="av-btn" onClick={()=>void refresh()} disabled={busy||status==='loading'}>刷新候选数据</button></div>
  {status==='loading'?<p>正在读取真实账号与业务主体…</p>:null}
  {status==='error'?<p role="alert" className={styles.error}>{error}</p>:null}
  {status==='ready'?<div className={styles.stack}>
   <h3>一、上游供应商组织成员（对接供应商采购单）</h3>
   <p className={styles.muted}>必须已验证供应商真实身份，并具有明确的邀请或审核凭证；停用后该成员无法再读取对应供应商 PO。</p>
   <label>供应商账号
    <select className={styles.search} value={supplierUser} onChange={e=>setSupplierUser(e.target.value)}>
     <option value="">选择已验证的账号</option>{users.map(u=><option value={u.userId} key={u.userId}>{u.email} · {u.displayName??u.userId}</option>)}
    </select>
   </label>
   <label>上游供应商 Partner
    <select className={styles.search} value={supplierPartner} onChange={e=>setSupplierPartner(e.target.value)}>
     <option value="">选择具有供应商/工厂角色的主体</option>{supplierPartners.map(p=><option value={p.id} key={p.id}>{p.displayName}</option>)}
    </select>
   </label>
   <label>审核凭证编号
    <input className={styles.search} minLength={8} maxLength={200} value={supplierEvidence} onChange={e=>setSupplierEvidence(e.target.value)} placeholder="已核验邀请/企业授权证据编号" />
   </label>
   {supplierState==='loading'?<p role="status">正在核对当前供应商组织授权…</p>:null}
   {supplierState==='ready'&&supplierAccess?<p className={styles.notice}>当前关系：{supplierAccess.status==='ACTIVE'?'已启用':supplierAccess.status==='DISABLED'?'已停用':'未授权'}；最近更新：{supplierAccess.updatedAt??'无记录'}</p>:null}
   {supplierState==='error'?<p className={styles.error} role="alert">供应商授权无法查询，禁止盲目提交。</p>:null}
   <label><input type="checkbox" checked={supplierAttested} onChange={e=>setSupplierAttested(e.target.checked)}/>
    我已审核该人员代表此上游供应商的权限及对应证据，确认启用/停用对采购单可见性的影响。
   </label>
   <div className={styles.heading}>
    <button type="button" className="av-btn" disabled={busy||supplierState!=='ready'||!supplierAttested||supplierAccess?.status==='ACTIVE'||!supplierUser||!supplierPartner||supplierEvidence.trim().length<8}
     onClick={()=>void act(async()=>{
       await request('/v1/auth/supplier-memberships','POST',{userId:supplierUser,partnerId:supplierPartner,status:'ACTIVE',evidenceRef:supplierEvidence.trim()});
       await refreshSupplierAccess();
      },'供应商成员授权已写入并重新核验状态')}>核验并启用成员</button>
    <button type="button" className="av-btn" disabled={busy||supplierState!=='ready'||!supplierAttested||supplierAccess?.status!=='ACTIVE'||!supplierUser||!supplierPartner||supplierEvidence.trim().length<8}
     onClick={()=>void act(async()=>{
      await request('/v1/auth/supplier-memberships','POST',{userId:supplierUser,partnerId:supplierPartner,status:'DISABLED',evidenceRef:supplierEvidence.trim()});
      await refreshSupplierAccess();
     },'供应商成员已停用，当前状态已重新核验')}>停用成员授权</button>
   </div>
   <h3>二、车辆已交付车主（对接 My ALSVID）</h3>
   <p className={styles.muted}>手工核验订单与交付凭据后建立车主访问权；VIN 不能代替交付凭据。转让时先撤销旧归属再核验新车主。</p>
   <label>已验证客户账号
    <select className={styles.search} value={ownerUser} onChange={e=>setOwnerUser(e.target.value)}>
     <option value="">选择拥有 customer_user 角色的账号</option>{customers.map(u=><option key={u.userId} value={u.userId}>{u.email} · {u.displayName??u.userId}</option>)}
    </select>
   </label>
   <label>车辆（车架号）
    <select className={styles.search} value={ownerVehicle} onChange={e=>setOwnerVehicle(e.target.value)}>
     <option value="">选择已出生车辆</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.frame_number}</option>)}
    </select>
   </label>
   <label>订单 / 交付审核证据编号
    <input className={styles.search} minLength={12} maxLength={200} value={ownerEvidence} onChange={e=>setOwnerEvidence(e.target.value)} placeholder="已核验交付/人工审核证据编号" />
   </label>
   {ownerState==='loading'?<p role="status">正在核对该车辆已有的车主授权…</p>:null}
   {ownerState==='ready'&&ownerAccess?<p className={styles.notice}>该车辆授权状态：{ownerAccess.status==='GRANTED'?'已有车主':ownerAccess.status==='REVOKED'?'已撤销':'未授权'}。{ownerAccess.customerUserId?'当前车主用户 ID：'+ownerAccess.customerUserId:''}</p>:null}
   {ownerState==='error'?<p className={styles.error} role="alert">无法查明当前车主授权，禁止盲目提交。</p>:null}
   <label><input type="checkbox" checked={ownerAttested} onChange={e=>setOwnerAttested(e.target.checked)}/>
    我已核验车辆交付/转让凭证和正确客户身份；不会依据邮箱相同或知晓 VIN 直接绑定。
   </label>
   <div className={styles.heading}>
    <button type="button" className="av-btn" disabled={busy||ownerState!=='ready'||!ownerAttested||ownerAccess?.status==='GRANTED'||!ownerUser||!ownerVehicle||ownerEvidence.trim().length<12}
     onClick={()=>void act(async()=>{
      await request('/v1/vehicles/'+encodeURIComponent(ownerVehicle)+'/owner-access/grant','POST',{customerUserId:ownerUser,evidenceRef:ownerEvidence.trim()});
      await refreshOwnerAccess();
     },'车主访问已保存并重新核验，My ALSVID 仅展示该用户的获授权车辆')}>确认交付并绑定车主</button>
    <button type="button" className="av-btn" disabled={busy||ownerState!=='ready'||!ownerAttested||ownerAccess?.status!=='GRANTED'||!ownerVehicle||ownerEvidence.trim().length<12}
     onClick={()=>void act(async()=>{
      await request('/v1/vehicles/'+encodeURIComponent(ownerVehicle)+'/owner-access/revoke','POST',{evidenceRef:ownerEvidence.trim()});
      await refreshOwnerAccess();
     },'旧车主访问权已撤销并重新核验')}>撤销当前车主访问</button>
   </div>
  </div>:null}
  {result?<p role="status" className={styles.notice}>{result}</p>:null}
  {error&&status==='ready'?<p role="alert" className={styles.error}>{error}</p>:null}
 </section>;
}
