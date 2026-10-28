'use client';

import { OperationsFrame } from '../_components/operations-frame';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import styles from './product.module.css';
import { adminSkuPricingHref } from '../_lib/admin-sku-pricing-navigation';
import { matchesModelRegisterSearch } from './model-register';

type Platform = { id: string; code: string; name: string; description: string; status: string; version: number };
type Model = { id: string; platform_id: string | null; product_type_code: 'BIKE' | 'ACCESSORY' | 'SERVICE_PART'; code: string; name: string; description: string; status: string; version: number };
type Variant = { id: string; model_id: string; code: string; name: string; description: string; status: string; version: number };
type Sku = { id: string; variant_id: string; sku: string; name: string; market_code: string | null; color_code: string | null; size_code: string | null; status: string; version: number };
type Catalog = { productTypes: {code:string;name:string;description:string;status:string}[]; platforms: Platform[]; models: Model[]; variants: Variant[]; skus: Sku[] };
type Part = { id: string; part_number: string; name: string; category: string; default_unit: string; status: string };
type BomRow = { id: string; code: string; name: string; model_id: string; model_code: string; revision_id: string | null; revision_code: string | null; revision_status: string | null; line_count: number | null };
type BuildSpec = { id: string; code: string; status: string; version: number; sku_id: string; sku: string; bom_revision_id: string; revision_code: string; bom_code: string };
type Engineering = { parts: Part[]; boms: BomRow[]; buildSpecs: BuildSpec[] };
type EditTarget = { entity: 'model' | 'variant' | 'sku'; id: string; version: number; name: string; status: string; description?: string; marketCode?: string | null; colorCode?: string | null; sizeCode?: string | null };

const emptyCatalog: Catalog = { productTypes: [], platforms: [], models: [], variants: [], skus: [] };
const emptyEngineering: Engineering = { parts: [], boms: [], buildSpecs: [] };

// Platform labels come from actual user-maintained records, not hardcoded example platforms.
function platformName(platform: Platform) { return platform.name; }
function platformDescription(platform: Platform) { return platform.description; }

function statusLabel(status: string | null | undefined) {
  if (!status) return '未设置';
  const labels: Record<string, string> = {
    DRAFT: '草稿',
    ACTIVE: '启用',
    RELEASED: '已发布',
    RETIRED: '已退役',
    INACTIVE: '停用',
    NO_REVISION: '暂无版本',
  };
  return labels[status] ?? status;
}

export default function ProductClient({ embedded = false, view = 'archive' }: { embedded?: boolean; view?: 'archive' | 'engineering' }) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [engineering, setEngineering] = useState<Engineering>(emptyEngineering);
  const [message, setMessage] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [engineeringError, setEngineeringError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modelSearch, setModelSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [newModelType, setNewModelType] = useState('BIKE');
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [workspace, setWorkspace] = useState<'bikes' | 'parts' | 'platforms'>('bikes');
  const [partTab, setPartTab] = useState<'manufacturing' | 'retail'>('manufacturing');
  const [createKind, setCreateKind] = useState<'bike' | 'part' | 'accessory' | null>(null);

  useEffect(() => {
    const revealLinkedPanel = () => {
      const id = window.location.hash.slice(1);
      if (view === 'archive') {
        const requestedType = new URLSearchParams(window.location.search).get('type');
        const nextWorkspace = id === 'series' || id === 'product-types' ? 'platforms'
          : id === 'parts' || requestedType === 'PARTS' ? 'parts' : 'bikes';
        setWorkspace(nextWorkspace);
        setTypeFilter(nextWorkspace === 'bikes' ? 'BIKE' : requestedType === 'PARTS' ? 'PARTS' : 'ALL');
        if (id === 'configuration') setCreateKind('bike');
      }
      // Preserve old bookmarks without offering a second BOM editor in product research.
      if (view === 'archive' && ['engineering', 'engineering-panel', 'production-bom'].includes(id)) {
        router.replace('/admin/production#production-bom');
        return;
      }
      const target = id ? document.getElementById(id) : null;
      const panel = target?.closest('details');
      if (target instanceof HTMLDetailsElement) target.open = true;
      if (panel) panel.open = true;
    };
    revealLinkedPanel();
    window.addEventListener('hashchange', revealLinkedPanel);
    return () => window.removeEventListener('hashchange', revealLinkedPanel);
  }, [view, router]);

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('登录状态已过期，请重新登录');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function reload(): Promise<boolean> {
    setLoading(true);
    setCatalogError('');
    setEngineeringError('');
    const [catalogResult, engineeringResult] = await Promise.allSettled([
      api('/v1/product/catalog'),
      api('/v1/engineering'),
    ]);
    if (catalogResult.status === 'fulfilled') {
      // WWW-only releases can precede the separately approved API/database migration.
      // Keep the existing model/SKU editor usable until the full domain release is verified.
      setCatalog({ ...emptyCatalog, ...(catalogResult.value as Partial<Catalog>) });
    } else {
      setCatalog(emptyCatalog);
      setCatalogError(catalogResult.reason instanceof Error ? catalogResult.reason.message : '请求异常');
    }
    if (engineeringResult.status === 'fulfilled') {
      setEngineering(engineeringResult.value as Engineering);
    } else {
      setEngineering(emptyEngineering);
      setEngineeringError(engineeringResult.reason instanceof Error ? engineeringResult.reason.message : '请求异常');
    }
    setLoading(false);
    return catalogResult.status === 'fulfilled' && engineeringResult.status === 'fulfilled';
  }

  useEffect(() => {
    const requestedSearch = new URLSearchParams(window.location.search).get('search');
    if (requestedSearch) setModelSearch(requestedSearch.slice(0,100));
    const requestedType = new URLSearchParams(window.location.search).get('type');
    if (requestedType === 'BIKE' || requestedType === 'PARTS') setTypeFilter(requestedType);
    else setTypeFilter('BIKE');
    void reload();
  }, []);

  const selectableProductTypes = catalog.productTypes.length
    ? catalog.productTypes.filter(type=>type.status==='ACTIVE')
    : [{code:'BIKE',name:'整车（兼容旧版 API）',description:'',status:'ACTIVE'}];

  const hierarchyRows = useMemo(() => [...catalog.models]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((model) => ({
      model,
      platform: catalog.platforms.find((item) => item.id === model.platform_id),
      variants: catalog.variants.filter((item) => item.model_id === model.id),
    })), [catalog]);

  const filteredModels = useMemo(() => hierarchyRows.filter(({ model, platform }) =>
    (statusFilter === 'ALL' || model.status === statusFilter)
    && (typeFilter === 'PARTS' ? model.product_type_code !== 'BIKE' : typeFilter === 'ALL' || model.product_type_code === typeFilter)
    && matchesModelRegisterSearch(
      model,
      platform ? { code: platform.code, name: platformName(platform) } : undefined,
      catalog,
      engineering,
      modelSearch,
      !loading && !engineeringError,
    ),
  ), [hierarchyRows, catalog, engineering, modelSearch, statusFilter, typeFilter, engineeringError, loading]);

  const filteredParts = useMemo(() => engineering.parts.filter(part =>
    [part.part_number, part.name, part.category].some(value => (value || '').toLocaleLowerCase().includes(modelSearch.toLocaleLowerCase()))
  ), [engineering.parts, modelSearch]);
  const filteredAccessories = useMemo(() => hierarchyRows.filter(({ model }) =>
    model.product_type_code !== 'BIKE'
    && [model.code, model.name, model.description].some(value => (value || '').toLocaleLowerCase().includes(modelSearch.toLocaleLowerCase()))
  ), [hierarchyRows, modelSearch]);
  const filteredPlatforms = useMemo(() => catalog.platforms.filter(platform =>
    [platform.code, platform.name, platform.description].some(value => (value || '').toLocaleLowerCase().includes(modelSearch.toLocaleLowerCase()))
  ), [catalog.platforms, modelSearch]);

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string, body: (form: FormData) => unknown, onSaved?: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body(form)) });
      formElement.reset();
      onSaved?.();
      const verified = await reload();
      setMessage(verified ? '已保存，列表已重新核对。' : '写入请求成功，但列表刷新失败；请先核对记录，不要重复提交。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    }
  }

  async function release(endpoint: string) {
    try {
      await api(endpoint, { method: 'POST', body: '{}' });
      const verified = await reload();
      setMessage(verified ? '工程发布成功，已重新核对版本。' : '发布请求成功，但列表刷新失败；请先核对版本，不要重复发布。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布失败');
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    const form = new FormData(event.currentTarget);
    try {
      await api(`/v1/product/${edit.entity}/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          expectedVersion: edit.version,
          name: form.get('name'),
          status: form.get('status'),
          description: edit.entity !== 'sku' ? form.get('description') : undefined,
          marketCode: edit.entity === 'sku' ? form.get('marketCode') : undefined,
          colorCode: edit.entity === 'sku' ? form.get('colorCode') : undefined,
          sizeCode: edit.entity === 'sku' ? form.get('sizeCode') : undefined,
        }),
      });
      setEdit(null);
      const verified = await reload();
      setMessage(verified ? '产品信息已更新，列表已重新核对。' : '更新请求成功，但列表刷新失败；请先核对记录，不要重复提交。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新失败');
    }
  }

  return (
    <OperationsFrame embedded={embedded} area={view === "engineering" ? "production" : "product"} footer={view === "engineering" ? "生产制造 / BOM" : "产品研发 / 商品档案"}>
      {view === "archive" ? <>
      <main className={styles.archiveWorkspace}>
        <header className={styles.archiveHeading}>
          <div className={styles.archiveHeadingCopy}>
            <span className={styles.archiveKicker}>产品研发 / 商品档案</span>
            <h1>{workspace === 'bikes' ? '整车产品' : workspace === 'parts' ? '零配件' : '技术平台'}</h1>
            <p>{workspace === 'bikes' ? '建立和维护整车档案。每个商品只保留一条主记录，版本与 SKU 按需管理。' : workspace === 'parts' ? '零件与可售配件分开查看，档案只录入一次，不重复建立商城绑定。' : '按真实平台记录查看整车技术分类，不预设型号或平台。'}</p>
          </div>
          <div className={styles.archiveHeadingActions}>
            <button type="button" className={styles.archiveSecondaryButton} onClick={() => void reload()} disabled={loading}>刷新</button>
            {workspace === 'bikes' ? <button type="button" className={styles.archivePrimaryButton} onClick={() => {setNewModelType('BIKE');setCreateKind('bike');}}>＋ 新建整车</button> : null}
            {workspace === 'parts' ? <button type="button" className={styles.archivePrimaryButton} onClick={() => { if (partTab === 'manufacturing') setCreateKind('part'); else {setNewModelType('ACCESSORY');setCreateKind('accessory');} }}>＋ {partTab === 'manufacturing' ? '新建零件' : '新建可售配件'}</button> : null}
          </div>
        </header>

        {message ? <div className={styles.archiveFeedback} role="status">{message}</div> : null}
        {(workspace === 'parts' && partTab === 'manufacturing' ? engineeringError : catalogError) ? (
          <div className={styles.archiveError} role="alert">数据读取失败：{workspace === 'parts' && partTab === 'manufacturing' ? engineeringError : catalogError}。读取异常不代表记录为零。</div>
        ) : null}
      </> : null}

      {view === "engineering" ? <>
      {message ? <div className={styles.notice} role="status">{message}</div> : null}
      {catalogError || engineeringError ? <div className={styles.notice} role="alert">生产用料数据读取失败：{[catalogError, engineeringError].filter(Boolean).join('；')}。读取失败不等于没有记录。</div> : null}
      <details className={styles.collapsiblePanel} id="production-bom">
        <summary>BOM / 生产用料清单 <span>创建 BOM、零件用量与生产版本</span></summary>
      <div className={styles.notice} role="note">BOM 从产品研发建立的商品及零件档案引用数据，不重复创建商品或零件。发布后的受控版本不能静默修改。</div>
      <section className={styles.section} id="engineering">
        <div className={styles.sectionHead}>
          <div><span>工程发布</span><h2>零部件、BOM 与生产规格</h2></div>
          <p>发布是受控状态转换。BOM Revision 和 Build Specification 一旦发布，就不能被静默修改；后续变更必须形成新的受控版本。</p>
        </div>
        <div className={styles.engineeringGrid}>
          <div className={styles.listCard} id="parts">
            <h3>零部件</h3>
            {engineering.parts.map((part) => <div className={styles.listRow} key={part.id}><b>{part.part_number}</b><span>{part.name}</span><small>{part.category} · {part.default_unit} · {statusLabel(part.status)}</small></div>)}
            {!engineering.parts.length ? <small>{loading ? '正在同步零部件…' : engineeringError ? '零部件读取失败' : '暂无零部件'}</small> : null}
          </div>
          <div className={styles.listCard}>
            <h3>BOM 版本</h3>
            {engineering.boms.map((bom) => (
              <div className={styles.listRow} key={`${bom.id}-${bom.revision_id ?? 'none'}`}>
                <b>{bom.code} · {bom.revision_code ?? '—'}</b>
                <span>{bom.model_code} · {bom.name}</span>
                <small>{bom.line_count ?? 0} 行 · {statusLabel(bom.revision_status ?? 'NO_REVISION')}</small>
                {bom.revision_id && bom.revision_status === 'DRAFT' ? <button onClick={() => void release(`/v1/engineering/bom-revisions/${bom.revision_id}/release`)}>发布 BOM</button> : null}
              </div>
            ))}
          </div>
          <div className={styles.listCard}>
            <h3>生产规格 / Build Spec</h3>
            {engineering.buildSpecs.map((spec) => (
              <div className={styles.listRow} key={spec.id}>
                <b>{spec.code}</b><span>{spec.sku} · {spec.bom_code}/{spec.revision_code}</span><small>{statusLabel(spec.status)}</small>
                {spec.status === 'DRAFT' ? <button onClick={() => void release(`/v1/engineering/build-specs/${spec.id}/release`)}>发布生产规格</button> : null}
              </div>
            ))}
            {!engineering.buildSpecs.length ? <small>{loading ? '正在同步生产规格…' : engineeringError ? '生产规格读取失败' : '暂无生产规格'}</small> : null}
          </div>
        </div>
      </section>

      <section className={styles.formsGrid}>
        <form onSubmit={(e) => void submitForm(e, '/v1/engineering/boms', (f) => ({ modelId: f.get('modelId'), code: f.get('code'), name: f.get('name'), revisionCode: f.get('revisionCode') }))}>
          <span>BOM 主数据</span><h3>创建 BOM 与草稿版本</h3>
          <select name="modelId" required defaultValue=""><option value="" disabled>选择车型</option>{catalog.models.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}</select>
          <input name="code" placeholder="例如：BOM-FC1" required />
          <input name="name" placeholder="BOM 名称" required />
          <input name="revisionCode" placeholder="版本，例如：A" />
          <button>创建 BOM</button>
        </form>

        <form onSubmit={(e) => void submitForm(e, `/v1/engineering/bom-revisions/${(e.currentTarget.elements.namedItem('revisionId') as HTMLSelectElement)?.value || 'missing'}/lines`, (f) => ({ lineNo: Number(f.get('lineNo')), partId: f.get('partId'), quantity: Number(f.get('quantity')), unit: f.get('unit') }))}>
          <span>BOM 明细</span><h3>添加零部件到草稿 BOM</h3>
          <select name="revisionId" required defaultValue=""><option value="" disabled>选择草稿版本</option>{engineering.boms.filter((b) => b.revision_id && b.revision_status === 'DRAFT').map((b) => <option key={b.revision_id!} value={b.revision_id!}>{b.code} / {b.revision_code}</option>)}</select>
          <select name="partId" required defaultValue=""><option value="" disabled>选择零部件</option>{engineering.parts.map((p) => <option key={p.id} value={p.id}>{p.part_number} · {p.name}</option>)}</select>
          <div className={styles.inline}><input name="lineNo" type="number" min="1" placeholder="行号 10" required /><input name="quantity" type="number" min="0.000001" step="any" placeholder="数量 1" required /><input name="unit" placeholder="单位 EA" /></div>
          <button>添加 BOM 明细</button>
        </form>

        <form onSubmit={(e) => void submitForm(e, '/v1/engineering/build-specs', (f) => ({ code: f.get('code'), skuId: f.get('skuId'), bomRevisionId: f.get('bomRevisionId'), notes: f.get('notes') }))}>
          <span>生产规格</span><h3>创建 Build Specification</h3>
          <input name="code" placeholder="例如：BS-FC1-PRO-DE-A" required />
          <select name="skuId" required defaultValue=""><option value="" disabled>选择 SKU</option>{catalog.skus.map((s) => <option key={s.id} value={s.id}>{s.sku}</option>)}</select>
          <select name="bomRevisionId" required defaultValue=""><option value="" disabled>选择 BOM 版本</option>{engineering.boms.filter((b) => b.revision_id).map((b) => <option key={b.revision_id!} value={b.revision_id!}>{b.code}/{b.revision_code} · {statusLabel(b.revision_status)}</option>)}</select>
          <input name="notes" placeholder="发布说明 / 备注" />
          <button>创建生产规格</button>
        </form>
      </section>

      </details>

      </> : null}

      {edit ? (
        <div className={styles.modal} onMouseDown={() => setEdit(null)}>
          <form className={styles.editCard} onSubmit={saveEdit} onMouseDown={(event) => event.stopPropagation()}>
            <div><span>编辑 {edit.entity.toUpperCase()}</span><h2>{edit.name}</h2></div>
            <label>名称<input name="name" defaultValue={edit.name} /></label>
            <label>状态<select name="status" defaultValue={edit.status}><option value="DRAFT">草稿</option><option value="ACTIVE">启用</option><option value="RETIRED">已退役</option></select></label>
            {edit.entity !== 'sku' ? (
              <label>说明<textarea name="description" defaultValue={edit.description ?? ''} /></label>
            ) : (
              <>
                <label>市场<input name="marketCode" maxLength={2} defaultValue={edit.marketCode ?? ''} /></label>
                <label>颜色<input name="colorCode" defaultValue={edit.colorCode ?? ''} /></label>
                <label>尺寸<input name="sizeCode" defaultValue={edit.sizeCode ?? ''} /></label>
              </>
            )}
            <div className={styles.actions}><button type="button" onClick={() => setEdit(null)}>取消</button><button>保存</button></div>
          </form>
        </div>
      ) : null}
    </OperationsFrame>
  );
}
