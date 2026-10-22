'use client';

import {useEffect,useState,type FormEvent} from 'react';
import styles from './catalog-publication-panel.module.css';

type Model={id:string;code:string;name:string;status:string;product_type_code:string};
type Publication={
  model_id:string;model_code:string;model_status:string;status:'DRAFT'|'IN_REVIEW'|'PUBLISHED'|'WITHDRAWN';
  title_zh:string;title_de:string;title_en:string;image_path:string;evidence_note:string;version:number;
  published_at:string|null;withdrawn_at:string|null;
};

async function publicationApi<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const response=await fetch('/api/control/v1/product/'+path,{
    method,cache:'no-store',...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)}),
  });
  const json=await response.json().catch(()=>null) as {data?:T;message?:string}|null;
  if(!response.ok)throw new Error(
    response.status===401?'登录已失效，请重新登录':
    response.status===403?'当前账号缺少商品发布或管理权限':json?.message??'商品发布接口操作失败');
  if(!json||!('data' in json))throw new Error('发布接口返回资料异常');
  return json.data as T;
}
const statuses:Record<Publication['status'],string>={
 DRAFT:'草稿',IN_REVIEW:'待审核',PUBLISHED:'已公开发布',WITHDRAWN:'已撤回',
};

export function CatalogPublicationPanel({models}:{models:readonly Model[]}){
  const [rows,setRows]=useState<Publication[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  async function refresh(){setRows(await publicationApi<Publication[]>('publications'));}
  useEffect(()=>{let live=true;void publicationApi<Publication[]>('publications').then(items=>{
    if(live)setRows(items);
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:'发布列表无法读取');})
    .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false};
  },[]);
  async function operate(modelId:string, action:()=>Promise<unknown>){
    if(busy)return;
    setError('');setMessage('');setBusy(modelId);
    try{
      await action();
      setMessage('操作已保存并记录审核日志；公开目录只展示正式发布的商品。');
      await refresh();
    }catch(e){
      setError(e instanceof Error?e.message:'保存失败，请刷新后重试');
    }finally{setBusy('');}
  }
  const eligible=models.filter(model=>model.status==='ACTIVE'&&model.product_type_code==='BIKE'&&
    (model.code==='FC1'||model.code==='FC2'));
  return <section id="catalog-publications" className={styles.section} aria-label="商品发布和审核">
    <header>
      <div><span>OFFICIAL PRODUCT CATALOGUE</span><h2>官网商品发布与审核</h2></div>
      <p>Product 内部 ACTIVE 与官网 PUBLISHED 分开管理。必须核对真实车图、三语标题及车型后，再提交并由具备发布权限的账号审核。发布不等于允许支付。</p>
    </header>
    {loading?<p role="status">正在读取真实发布记录…</p>:null}
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    {message?<p className={styles.info} role="status">{message}</p>:null}
    <div className={styles.grid}>
      {eligible.map(model=>{
        const publication=rows.find(item=>item.model_id===model.id);
        return <article className={styles.card} key={model.id}>
          <h3>{model.code} · {model.name}</h3>
          <p>Model ID：{model.id}</p>
          {!publication?
            <div>
              <p>尚未建立公开发布草稿。此商品不会出现在已发布商品 API 中。</p>
              <button type="button" disabled={!!busy||loading} onClick={()=>void operate(model.id,()=>publicationApi('publications/'+encodeURIComponent(model.id)+'/start','POST'))}>建立发布草稿</button>
            </div>:
            <PublicationEditor key={publication.model_id+':'+publication.version} item={publication}
              disabled={!!busy} save={(body)=>operate(model.id,()=>publicationApi('publications/'+encodeURIComponent(model.id)+'/draft','PATCH',body))}
              transition={(action)=>operate(model.id,()=>publicationApi('publications/'+encodeURIComponent(model.id)+'/transition','POST',{action,expectedVersion:publication.version}))}/>
          }
        </article>;
      })}
    </div>
    {!loading&&!eligible.length?<p>当前没有可审核的 FC1/FC2 有效整车，请先检查产品型号数据；不会自动生成虚构商品。</p>:null}
    <p className={styles.note}>首批只支持已有真实详情页与已登记车图的 FC1/FC2。其他整车、配件、图片和适配规则需要独立验证，不会因为类型是 ACTIVE 就自动上架。</p>
  </section>;
}

function PublicationEditor({item,disabled,save,transition}:{
  item:Publication;disabled:boolean;
  save:(body:{expectedVersion:number;titleZh:string;titleDe:string;titleEn:string;evidenceNote:string})=>Promise<void>;
  transition:(action:'SUBMIT'|'PUBLISH'|'WITHDRAW')=>Promise<void>;
}){
  const [zh,setZh]=useState(item.title_zh);
  const [de,setDe]=useState(item.title_de);
  const [en,setEn]=useState(item.title_en);
  const [evidence,setEvidence]=useState(item.evidence_note);
  const editable=item.status==='DRAFT'||item.status==='WITHDRAWN';
  const changed=zh!==item.title_zh||de!==item.title_de||en!==item.title_en||evidence!==item.evidence_note;
  const ready=Boolean(item.title_zh&&item.title_de&&item.title_en&&item.evidence_note&&item.image_path);
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();void save({expectedVersion:item.version,titleZh:zh,titleDe:de,titleEn:en,evidenceNote:evidence});
  }
  return <div className={styles.editor}>
    <span className={styles.status}>{statuses[item.status]}</span>
    <small>图片：{item.image_path||'草稿尚未核对图片'}</small>
    <form onSubmit={submit}>
      <label>中文标题<input value={zh} onChange={e=>setZh(e.target.value)} minLength={2} maxLength={120} required disabled={!editable||disabled}/></label>
      <label>德语标题<input value={de} onChange={e=>setDe(e.target.value)} minLength={2} maxLength={120} required disabled={!editable||disabled}/></label>
      <label>英文标题<input value={en} onChange={e=>setEn(e.target.value)} minLength={2} maxLength={120} required disabled={!editable||disabled}/></label>
      <label>产品与实物图核对记录<textarea value={evidence} onChange={e=>setEvidence(e.target.value)} minLength={2} maxLength={500} rows={2} required disabled={!editable||disabled} placeholder="记录实物图来源、车型与详情页核对结果"/></label>
      {editable?<button type="submit" disabled={disabled||!changed}>保存草稿</button>:null}
    </form>
    <div className={styles.actions}>
      {editable?<button type="button" disabled={disabled||!ready||changed} onClick={()=>void transition('SUBMIT')}>提交审核</button>:null}
      {item.status==='IN_REVIEW'?<button type="button" disabled={disabled} onClick={()=>{
        if(window.confirm('确认已核验真实车型、素材和中德英标题，将此商品公开发布？'))void transition('PUBLISH');
      }}>审核并发布</button>:null}
      {item.status==='PUBLISHED'?<button type="button" disabled={disabled} onClick={()=>{
        if(window.confirm('确认撤回公开目录里的此商品？'))void transition('WITHDRAW');
      }}>撤回发布</button>:null}
    </div>
    <small>版本 {item.version} · {item.published_at?'发布于 '+new Date(item.published_at).toLocaleString('zh-CN'):'未正式发布'}</small>
  </div>;
}
