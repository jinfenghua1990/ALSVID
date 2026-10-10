'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './product.module.css';

type Platform = { id: string; code: string; name: string; description: string; status: string; version: number };
type Model = { id: string; platform_id: string; code: string; name: string; description: string; status: string; version: number };
type Variant = { id: string; model_id: string; code: string; name: string; description: string; status: string; version: number };
type Sku = { id: string; variant_id: string; sku: string; name: string; market_code: string | null; color_code: string | null; size_code: string | null; status: string; version: number };
type Catalog = { platforms: Platform[]; models: Model[]; variants: Variant[]; skus: Sku[] };
type Part = { id: string; part_number: string; name: string; category: string; default_unit: string; status: string };
type BomRow = { id: string; code: string; name: string; model_id: string; model_code: string; revision_id: string | null; revision_code: string | null; revision_status: string | null; line_count: number | null };
type BuildSpec = { id: string; code: string; status: string; version: number; sku_id: string; sku: string; bom_revision_id: string; revision_code: string; bom_code: string };
type Engineering = { parts: Part[]; boms: BomRow[]; buildSpecs: BuildSpec[] };
type EditTarget = { entity: 'model' | 'variant' | 'sku'; id: string; version: number; name: string; status: string; description?: string; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null };

const emptyCatalog: Catalog = { platforms: [], models: [], variants: [], skus: [] };
const emptyEngineering: Engineering = { parts: [], boms: [], buildSpecs: [] };

export default function ProductClient() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [engineering, setEngineering] = useState<Engineering>(emptyEngineering);
  const [message, setMessage] = useState('');
  const [edit, setEdit] = useState<EditTarget | null>(null);

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) { router.push('/login'); throw new Error('Session expired'); }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? 'Request failed');
    return payload.data;
  }

  async function reload() {
    try {
      const [nextCatalog, nextEngineering] = await Promise.all([api('/v1/product/catalog'), api('/v1/engineering')]);
      setCatalog(nextCatalog);
      setEngineering(nextEngineering);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load Product workspace'); }
  }
  useEffect(() => { void reload(); }, []);

  const hierarchyRows = useMemo(() => catalog.models.map((model) => ({
    model,
    platform: catalog.platforms.find((item) => item.id === model.platform_id),
    variants: catalog.variants.filter((item) => item.model_id === model.id),
  })), [catalog]);

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string, body: (form: FormData) => unknown) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body(form)) });
      event.currentTarget.reset();
      setMessage('Saved.');
      await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save'); }
  }

  async function release(endpoint: string) {
    try { await api(endpoint, { method: 'POST', body: '{}' }); setMessage('Released. This revision is now immutable.'); await reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to release'); }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/v1/product/${edit.entity}/${edit.id}`, { method: 'PATCH', body: JSON.stringify({ expectedVersion: edit.version, name: form.get('name'), status: form.get('status'), description: edit.entity !== 'sku' ? form.get('description') : undefined, marketCode: edit.entity === 'sku' ? form.get('marketCode') : undefined, colorCode: edit.entity === 'sku' ? form.get('colorCode') : undefined, sizeCode: edit.entity === 'sku' ? form.get('sizeCode') : undefined }) });
      setEdit(null); setMessage('Product updated.'); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update'); }
  }

  return <main className={styles.shell}>
    <aside className={styles.rail}><a className={styles.brand} href="/">ALSVID</a><nav><a href="/">Overview</a><a className={styles.active} href="/product">Product</a><a href="/partners">Partners</a></nav><div className={styles.foot}>Product · Engineering · Assets</div></aside>
    <section className={styles.workspace}>
      <header className={styles.header}><div><div className={styles.eyebrow}>PRODUCT & ENGINEERING</div><h1>Define what can be built.</h1><p>Commercial hierarchy and released engineering truth stay separate from every physical Vehicle that will be born later.</p></div><div className={styles.releaseBadge}>V1 Engineering Control</div></header>
      {message ? <div className={styles.notice}>{message}</div> : null}

      <div className={styles.platforms}>{catalog.platforms.map((platform) => <article key={platform.id}><span>{platform.code}</span><h2>{platform.name}</h2><p>{platform.description}</p><small>{catalog.models.filter((model) => model.platform_id === platform.id).length} models</small></article>)}</div>

      <section className={styles.section}><div className={styles.sectionHead}><div><span>PRODUCT HIERARCHY</span><h2>Model → Variant → SKU</h2></div></div>
        <div className={styles.hierarchy}>{hierarchyRows.map(({ model, platform, variants }) => <div className={styles.modelBlock} key={model.id}><div className={styles.modelLine}><div><small>{platform?.code}</small><b>{model.code}</b><span>{model.name}</span></div><button onClick={() => setEdit({ entity:'model', id:model.id, version:model.version, name:model.name, status:model.status, description:model.description })}>Edit</button></div>{variants.map((variant) => <div className={styles.variantBlock} key={variant.id}><div className={styles.variantLine}><div><b>{variant.code}</b><span>{variant.name}</span></div><button onClick={() => setEdit({ entity:'variant', id:variant.id, version:variant.version, name:variant.name, status:variant.status, description:variant.description })}>Edit</button></div><div className={styles.skuList}>{catalog.skus.filter((sku) => sku.variant_id === variant.id).map((sku) => <div className={styles.sku} key={sku.id}><div><b>{sku.sku}</b><span>{sku.name}</span><small>{[sku.market_code,sku.color_code,sku.size_code].filter(Boolean).join(' · ') || 'Base configuration'}</small></div><button onClick={() => setEdit({ entity:'sku', id:sku.id, version:sku.version, name:sku.name, status:sku.status, marketCode:sku.market_code, colorCode:sku.color_code, sizeCode:sku.size_code })}>Edit</button></div>)}</div></div>)}</div>)}</div>
      </section>

      <section className={styles.formsGrid}>
        <form onSubmit={(e) => void submitForm(e, '/v1/product/models', (f) => ({ platformId:f.get('platformId'), code:f.get('code'), name:f.get('name'), description:f.get('description') }))}><span>NEW MODEL</span><h3>Create model</h3><select name="platformId" required defaultValue=""><option value="" disabled>Platform</option>{catalog.platforms.map((p)=><option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select><input name="code" placeholder="FC1" required/><input name="name" placeholder="Folding flagship" required/><input name="description" placeholder="Description"/><button>Create model</button></form>
        <form onSubmit={(e) => void submitForm(e, '/v1/product/variants', (f) => ({ modelId:f.get('modelId'), code:f.get('code'), name:f.get('name'), description:f.get('description') }))}><span>NEW VARIANT</span><h3>Create variant</h3><select name="modelId" required defaultValue=""><option value="" disabled>Model</option>{catalog.models.map((m)=><option key={m.id} value={m.id}>{m.code}</option>)}</select><input name="code" placeholder="PRO" required/><input name="name" placeholder="Pro" required/><input name="description" placeholder="Description"/><button>Create variant</button></form>
        <form onSubmit={(e) => void submitForm(e, '/v1/product/skus', (f) => ({ variantId:f.get('variantId'), sku:f.get('sku'), name:f.get('name'), marketCode:f.get('marketCode') || undefined, colorCode:f.get('colorCode') || undefined, sizeCode:f.get('sizeCode') || undefined }))}><span>NEW SKU</span><h3>Create sellable identity</h3><select name="variantId" required defaultValue=""><option value="" disabled>Variant</option>{catalog.variants.map((v)=><option key={v.id} value={v.id}>{catalog.models.find(m=>m.id===v.model_id)?.code} · {v.code}</option>)}</select><input name="sku" placeholder="FC1-PRO-DE-BLK" required/><input name="name" placeholder="FC1 Pro Black" required/><div className={styles.inline}><input name="marketCode" maxLength={2} placeholder="DE"/><input name="colorCode" placeholder="BLACK"/><input name="sizeCode" placeholder="20"/></div><button>Create SKU</button></form>
      </section>

      <section className={styles.section}><div className={styles.sectionHead}><div><span>ENGINEERING RELEASE</span><h2>Parts, BOM and Build Specification</h2></div><p>Release is a controlled state transition. Once released, BOM content and Build Specification cannot be silently edited.</p></div>
        <div className={styles.engineeringGrid}>
          <div className={styles.listCard}><h3>Parts</h3>{engineering.parts.map((part)=><div className={styles.listRow} key={part.id}><b>{part.part_number}</b><span>{part.name}</span><small>{part.category} · {part.default_unit}</small></div>)}{!engineering.parts.length?<small>No parts yet</small>:null}</div>
          <div className={styles.listCard}><h3>BOM revisions</h3>{engineering.boms.map((bom)=><div className={styles.listRow} key={`${bom.id}-${bom.revision_id ?? 'none'}`}><b>{bom.code} · {bom.revision_code ?? '—'}</b><span>{bom.model_code} · {bom.name}</span><small>{bom.line_count ?? 0} lines · {bom.revision_status ?? 'No revision'}</small>{bom.revision_id && bom.revision_status==='DRAFT'?<button onClick={()=>void release(`/v1/engineering/bom-revisions/${bom.revision_id}/release`)}>Release BOM</button>:null}</div>)}</div>
          <div className={styles.listCard}><h3>Build specs</h3>{engineering.buildSpecs.map((spec)=><div className={styles.listRow} key={spec.id}><b>{spec.code}</b><span>{spec.sku} · {spec.bom_code}/{spec.revision_code}</span><small>{spec.status}</small>{spec.status==='DRAFT'?<button onClick={()=>void release(`/v1/engineering/build-specs/${spec.id}/release`)}>Release spec</button>:null}</div>)}{!engineering.buildSpecs.length?<small>No build specifications yet</small>:null}</div>
        </div>
      </section>

      <section className={styles.formsGrid}>
        <form onSubmit={(e)=>void submitForm(e,'/v1/engineering/parts',(f)=>({partNumber:f.get('partNumber'),name:f.get('name'),category:f.get('category'),defaultUnit:f.get('defaultUnit')}))}><span>PART MASTER</span><h3>Create part</h3><input name="partNumber" placeholder="FRAME-FC1-001" required/><input name="name" placeholder="FC1 carbon frame" required/><div className={styles.inline}><input name="category" placeholder="FRAME"/><input name="defaultUnit" placeholder="EA"/></div><button>Create part</button></form>
        <form onSubmit={(e)=>void submitForm(e,'/v1/engineering/boms',(f)=>({modelId:f.get('modelId'),code:f.get('code'),name:f.get('name'),revisionCode:f.get('revisionCode')}))}><span>BOM MASTER</span><h3>Create BOM + draft revision</h3><select name="modelId" required defaultValue=""><option value="" disabled>Model</option>{catalog.models.map(m=><option key={m.id} value={m.id}>{m.code}</option>)}</select><input name="code" placeholder="BOM-FC1" required/><input name="name" placeholder="FC1 production BOM" required/><input name="revisionCode" placeholder="A"/><button>Create BOM</button></form>
        <form onSubmit={(e)=>void submitForm(e,`/v1/engineering/bom-revisions/${(e.currentTarget.elements.namedItem('revisionId') as HTMLSelectElement)?.value || 'missing'}/lines`,(f)=>({lineNo:Number(f.get('lineNo')),partId:f.get('partId'),quantity:Number(f.get('quantity')),unit:f.get('unit')}))}><span>BOM LINE</span><h3>Add part to draft BOM</h3><select name="revisionId" required defaultValue=""><option value="" disabled>Draft revision</option>{engineering.boms.filter(b=>b.revision_id&&b.revision_status==='DRAFT').map(b=><option key={b.revision_id!} value={b.revision_id!}>{b.code} / {b.revision_code}</option>)}</select><select name="partId" required defaultValue=""><option value="" disabled>Part</option>{engineering.parts.map(p=><option key={p.id} value={p.id}>{p.part_number} · {p.name}</option>)}</select><div className={styles.inline}><input name="lineNo" type="number" min="1" placeholder="10" required/><input name="quantity" type="number" min="0.000001" step="any" placeholder="1" required/><input name="unit" placeholder="EA"/></div><button>Add BOM line</button></form>
        <form onSubmit={(e)=>void submitForm(e,'/v1/engineering/build-specs',(f)=>({code:f.get('code'),skuId:f.get('skuId'),bomRevisionId:f.get('bomRevisionId'),notes:f.get('notes')}))}><span>BUILD SPEC</span><h3>Create production specification</h3><input name="code" placeholder="BS-FC1-PRO-DE-A" required/><select name="skuId" required defaultValue=""><option value="" disabled>SKU</option>{catalog.skus.map(s=><option key={s.id} value={s.id}>{s.sku}</option>)}</select><select name="bomRevisionId" required defaultValue=""><option value="" disabled>BOM revision</option>{engineering.boms.filter(b=>b.revision_id).map(b=><option key={b.revision_id!} value={b.revision_id!}>{b.code}/{b.revision_code} · {b.revision_status}</option>)}</select><input name="notes" placeholder="Release notes"/><button>Create build spec</button></form>
      </section>
    </section>

    {edit ? <div className={styles.modal} onMouseDown={()=>setEdit(null)}><form className={styles.editCard} onSubmit={saveEdit} onMouseDown={(e)=>e.stopPropagation()}><div><span>EDIT {edit.entity.toUpperCase()}</span><h2>{edit.name}</h2></div><label>Name<input name="name" defaultValue={edit.name}/></label><label>Status<select name="status" defaultValue={edit.status}><option>DRAFT</option><option>ACTIVE</option><option>RETIRED</option></select></label>{edit.entity!=='sku'?<label>Description<textarea name="description" defaultValue={edit.description ?? ''}/></label>:<><label>Market<input name="marketCode" maxLength={2} defaultValue={edit.marketCode ?? ''}/></label><label>Color<input name="colorCode" defaultValue={edit.colorCode ?? ''}/></label><label>Size<input name="sizeCode" defaultValue={edit.sizeCode ?? ''}/></label></>}<div className={styles.actions}><button type="button" onClick={()=>setEdit(null)}>Cancel</button><button>Save</button></div></form></div>:null}
  </main>;
}
