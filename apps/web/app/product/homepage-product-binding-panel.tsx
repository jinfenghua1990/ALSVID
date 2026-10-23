'use client';

import {useCallback,useEffect,useState} from 'react';
import styles from './homepage-product-binding-panel.module.css';

type Model = {id:string;code:string;name:string;status:string;product_type_code:string};
type Slot = {slot_code:'FC1_HERO'|'FC1_FEATURED'|'FC2_LAUNCH';target_model_code:string;mode:'AUTO'|'MANUAL';
 manual_model_id:string|null;resolved_model_id:string|null;resolved_model_code:string|null;version:number};
const labels:Record<Slot['slot_code'],string>={
 FC1_HERO:'首页首屏 · FC1',FC1_FEATURED:'首页重点产品 · FC1',FC2_LAUNCH:'首页新品区 · FC2',
};

async function api<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/control/v1/product/'+path,{
  cache:'no-store',method:body===undefined?'GET':'POST',
  ...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)}),
 });
 const parsed=await response.json().catch(()=>null) as {data?:T;message?:string}|null;
 if(!response.ok)throw new Error(response.status===403?'当前账户无权限操作首页商品绑定':parsed?.message??'商品绑定操作失败');
 if(!parsed||!('data' in parsed))throw new Error('首页绑定接口返回格式错误');
 return parsed.data as T;
}

/** Admin-only selection; public homepage receives a minimal, verified model ID projection. */
export function HomepageProductBindingPanel({models,loadError}:{models:readonly Model[];loadError:string}){
 const [slots,setSlots]=useState<Slot[]>([]);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
  const data=await api<Slot[]>('homepage-bindings');setSlots(data);
 },[]);
 useEffect(()=>{let active=true;void api<Slot[]>('homepage-bindings').then(data=>{
  if(active)setSlots(data);
 }).catch(e=>{if(active)setError(e instanceof Error?e.message:'绑定资料读取失败');})
 .finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[]);

 async function save(slot:Slot,mode:Slot['mode'],modelId:string|null){
  if(saving)return;
  setError('');setNotice('');setSaving(slot.slot_code);
  try{
   const saved=await api<Slot>('homepage-bindings',{
    slot:slot.slot_code,mode,modelId:mode==='MANUAL'?modelId:null,expectedVersion:slot.version,
   });
   setSlots(list=>list.map(item=>item.slot_code===saved.slot_code?saved:item));
   setNotice('绑定规则已保存。仅建立真实商品 ID 引用，不等于商品审核通过或自动上架。');
   try{await refresh();}catch{setError('保存已成功，但列表未能再次核验，请刷新页面确认。');}
  }catch(e){setError(e instanceof Error?e.message:'绑定失败，请刷新后重试');}
  finally{setSaving(null);}
 }
 return <section className={styles.section} id="homepage-bindings" aria-label="首页商品 ID 绑定">
  <header><div><span>WWW PRODUCT LINKING</span><h2>首页产品 ID 绑定</h2></div>
   <p>默认自动匹配已启用的同名整车型号；手动模式只能指定与展示车型完全一致的真实 Model ID，防止图片与商品错配。</p></header>
  {loading?<p role="status">正在核对首页商品绑定…</p>:null}
  {loadError?<p role="alert">产品主数据无法读取：{loadError}。暂不可人工绑定。</p>:null}
  {error?<p role="alert" className={styles.error}>{error}</p>:null}
  {notice?<p role="status" className={styles.notice}>{notice}</p>:null}
  <div className={styles.grid}>
   {slots.map(slot=>{
    const candidates=models.filter(m=>m.code===slot.target_model_code&&m.status==='ACTIVE'&&m.product_type_code==='BIKE');
    return <SlotEditor key={slot.slot_code} slot={slot} candidates={candidates} disabled={Boolean(saving||loadError)}
      busy={saving===slot.slot_code} save={save}/>;
   })}
  </div>
  {!loading&&!error&&!slots.length?<div className={styles.emptyState}>
   <strong>接口暂未返回首页展示位置</strong>
   <p>未创建虚构绑定。请先核对首页绑定配置、数据库迁移与当前账号权限。</p>
   <a href="/admin/product#model-register" className={styles.inlineLink}>前往产品研发检查型号 →</a>
  </div>:null}
  <p className={styles.footnote}>当前仅绑定产品主 ID。官网已有 FC1/FC2 图片、文案和详情路径保持不变；正式商品发布、实际售价、库存和支付仍须独立审核。</p>
 </section>;
}

function SlotEditor({slot,candidates,disabled,busy,save}:{
 slot:Slot;candidates:readonly Model[];disabled:boolean;busy:boolean;
 save:(slot:Slot,mode:Slot['mode'],modelId:string|null)=>Promise<void>;
}){
 const [mode,setMode]=useState(slot.mode);
 const [modelId,setModelId]=useState(slot.manual_model_id??'');
 useEffect(()=>{setMode(slot.mode);setModelId(slot.manual_model_id??'');},[slot.mode,slot.manual_model_id,slot.version]);
 return <article className={styles.card}>
  <h3>{labels[slot.slot_code]}</h3>
  <small>目标型号：{slot.target_model_code}</small>
  <div className={styles.fact}>当前状态：{slot.resolved_model_id?'已关联':'尚未找到可关联的有效商品'}</div>
  <div className={styles.identifier}>Model ID：{slot.resolved_model_id??'—'}</div>
  {!candidates.length?<a href="/admin/product#model-register" className={styles.inlineLink}>检查型号状态与产品类型 →</a>:null}
  <label>绑定方式
   <select value={mode} disabled={disabled} onChange={e=>setMode(e.target.value as Slot['mode'])}>
    <option value="AUTO">自动（推荐）</option><option value="MANUAL">手动指定</option>
   </select>
  </label>
  {mode==='MANUAL'?<label>选择相同型号的商品 ID
   <select value={modelId} disabled={disabled||!candidates.length} onChange={e=>setModelId(e.target.value)}>
    <option value="">请选择真实商品</option>
    {candidates.map(model=><option key={model.id} value={model.id}>{model.code} · {model.name} · {model.id.slice(0,8)}</option>)}
   </select>
  </label>:null}
  <button type="button" disabled={disabled||(mode==='MANUAL'&&!modelId)} onClick={()=>void save(slot,mode,modelId||null)}>
   {busy?'保存中…':'保存绑定规则'}
  </button>
 </article>;
}
