'use client';

import { OperationsFrame } from '../_components/operations-frame';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import styles from './product.module.css';
import { matchesModelRegisterSearch, modelBomSummary, modelEngineeringStage } from './model-register';

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

const PLATFORM_PRESENTATION: Record<string, { name: string; description: string; order: number }> = {
  FC: { name: 'Folding Carbon', description: '碳纤维折叠技术平台', order: 0 },
  CT: { name: 'City Touring', description: '城市通勤技术平台', order: 1 },
  FT: { name: 'Fat Tire', description: '胖胎技术平台', order: 2 },
  GT: { name: 'Gravel/Touring', description: 'Gravel 与长途旅行技术平台', order: 3 },
};

function platformName(platform: Platform) {
  return PLATFORM_PRESENTATION[platform.code]?.name ?? platform.name;
}

function platformDescription(platform: Platform) {
  return PLATFORM_PRESENTATION[platform.code]?.description ?? platform.description;
}

function platformOrder(code: string) {
  return PLATFORM_PRESENTATION[code]?.order ?? 99;
}

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

export default function ProductClient({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [engineering, setEngineering] = useState<Engineering>(emptyEngineering);
  const [message, setMessage] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [engineeringError, setEngineeringError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modelSearch, setModelSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [edit, setEdit] = useState<EditTarget | null>(null);

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
      setCatalog(catalogResult.value as Catalog);
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

  useEffect(() => { void reload(); }, []);

  const hierarchyRows = useMemo(() => [...catalog.models]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((model) => ({
      model,
      platform: catalog.platforms.find((item) => item.id === model.platform_id),
      variants: catalog.variants.filter((item) => item.model_id === model.id),
    })), [catalog]);

  const filteredModels = useMemo(() => hierarchyRows.filter(({ model, platform }) =>
    (statusFilter === 'ALL' || model.status === statusFilter)
    && matchesModelRegisterSearch(
      model,
      platform ? { code: platform.code, name: platformName(platform) } : undefined,
      catalog,
      engineering,
      modelSearch,
      !loading && !engineeringError,
    ),
  ), [hierarchyRows, catalog, engineering, modelSearch, statusFilter, engineeringError, loading]);

  async function submitForm(event: FormEvent<HTMLFormElement>, endpoint: string, body: (form: FormData) => unknown) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body(form)) });
      event.currentTarget.reset();
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
    <OperationsFrame embedded={embedded} area="product" footer="产品 / 工程 / 资产">
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>ALSVID PRODUCT CENTER</div>
          <h1>ALSVID 产品中心</h1>
          <p>统一维护技术平台、车型、配置版本、SKU 与工程发布关系；生产和销售系统以这里的产品主数据为准。</p>
        </div>
        <div className={styles.releaseBadge}>产品主数据 · 工程控制</div>
      </header>

      {message ? <div className={styles.notice} role="status">{message}</div> : null}
      {catalogError || engineeringError ? (
        <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
          {[catalogError ? `产品主数据加载失败：${catalogError}` : '', engineeringError ? `工程数据加载失败：${engineeringError}` : ''].filter(Boolean).join('；')}
          。接口异常不代表数据库没有记录，未成功读取的数据不会按 0 处理。
        </div>
      ) : null}

      <div className={styles.metrics} aria-label="产品数据概览">
        <div><span>技术平台</span><strong>{loading || catalogError ? '—' : catalog.platforms.length}</strong></div>
        <div><span>产品型号</span><strong>{loading || catalogError ? '—' : catalog.models.length}</strong></div>
        <div><span>配置版本</span><strong>{loading || catalogError ? '—' : catalog.variants.length}</strong></div>
        <div><span>SKU</span><strong>{loading || catalogError ? '—' : catalog.skus.length}</strong></div>
        <div><span>BOM</span><strong>{loading || engineeringError ? '—' : engineering.boms.length}</strong></div>
        <div><span>零部件</span><strong>{loading || engineeringError ? '—' : engineering.parts.length}</strong></div>
      </div>

      <section className={styles.seriesSection} id="series">
        <div className={styles.sectionHead}>
          <div><span>TECHNOLOGY PLATFORMS</span><h2>技术平台</h2></div>
          <p>固定平台顺序：FC、CT、FT、GT。平台定义产品技术方向；具体车型、配置和 SKU 在下方管理。</p>
        </div>
        <div className={styles.platforms}>
          {[...catalog.platforms].sort((a, b) => platformOrder(a.code) - platformOrder(b.code)).map((platform) => (
            <article key={platform.id}>
              <span>{platform.code}</span>
              <h2>{platformName(platform)}</h2>
              <p>{platformDescription(platform)}</p>
              <small>{catalog.models.filter((model) => model.platform_id === platform.id).length} 个型号</small>
            </article>
          ))}
          {!catalog.platforms.length ? <div className={styles.emptySeries}>{loading ? '正在读取技术平台…' : catalogError ? '平台数据未能读取；请检查接口状态。' : '暂无技术平台数据。'}</div> : null}
        </div>
      </section>

      <section className={styles.section} id="model-register">
        <div className={styles.sectionHead}>
          <div><span>MODEL REGISTER</span><h2>产品型号总表</h2></div>
          <p>先按型号查看平台、配置版本、产品状态、工程阶段和 BOM 关联；工程阶段仅根据当前真实 BOM / 生产规格记录判断。</p>
        </div>
        <div className={styles.modelToolbar}>
          <input
            aria-label="搜索产品型号"
            value={modelSearch}
            onChange={(event) => setModelSearch(event.target.value)}
            placeholder="搜索型号、平台、版本、SKU、BOM（VIN 请到车辆查询）"
          />
          <select aria-label="按产品状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="ACTIVE">启用</option>
            <option value="RETIRED">已退役</option>
          </select>
          <a href="/admin/production/vin">VIN / 车辆查询 →</a>
          <span>{loading ? '正在同步…' : catalogError ? '型号数据未确认' : `${filteredModels.length} / ${catalog.models.length} 个型号`}</span>
        </div>
        {loading && catalog.models.length === 0 ? (
          <div className={styles.emptyState}>正在读取产品主数据…</div>
        ) : filteredModels.length ? (
          <div className={styles.modelTableWrap}>
            <table className={styles.modelTable}>
              <thead>
                <tr>
                  <th>型号</th>
                  <th>技术平台</th>
                  <th>配置版本</th>
                  <th>状态</th>
                  <th>当前工程阶段</th>
                  <th>关联 BOM</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map(({ model, platform, variants }) => (
                  <tr key={model.id}>
                    <td><strong>{model.code}</strong><small>{model.name}</small></td>
                    <td><strong>{platform?.code ?? '—'}</strong><small>{platform ? platformName(platform) : '平台未关联'}</small></td>
                    <td>{variants.length ? variants.map((variant) => variant.name || variant.code).join(' / ') : '未配置'}</td>
                    <td><span className={styles.statusBadge}>{statusLabel(model.status)}</span></td>
                    <td><span className={styles.stageBadge}>{loading ? '正在核对…' : engineeringError ? '工程数据不可用' : modelEngineeringStage(model.id, catalog, engineering)}</span></td>
                    <td>{loading ? '正在核对…' : engineeringError ? '工程数据不可用' : modelBomSummary(model.id, engineering)}</td>
                    <td><button type="button" className={styles.tableAction} onClick={() => setEdit({ entity: 'model', id: model.id, version: model.version, name: model.name, status: model.status, description: model.description })}>编辑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            {catalogError
              ? '暂时无法确认型号数据。请先检查 API 连接与权限，不要将接口异常判断为数据库为空。'
              : modelSearch || statusFilter !== 'ALL'
                ? '没有符合当前筛选条件的型号。'
                : '当前没有已登记的真实型号。请在下方创建车型；系统不会自动填充示例记录。'}
          </div>
        )}
      </section>

      <section className={styles.section} id="models">
        <div className={styles.sectionHead}>
          <div><span>PRODUCT STRUCTURE</span><h2>产品结构明细：车型 → Variant → SKU</h2></div>
          <p>这里用于维护型号下的商业版本与可销售 SKU；总表负责筛选和查看，结构树负责编辑下级产品对象。</p>
        </div>
        <div className={styles.hierarchy}>
          {hierarchyRows.map(({ model, platform, variants }) => (
            <div className={styles.modelBlock} key={model.id}>
              <div className={styles.modelLine}>
                <div><small>{platform?.code}</small><b>{model.code}</b><span>{model.name}</span><small>{statusLabel(model.status)}</small></div>
                <button onClick={() => setEdit({ entity: 'model', id: model.id, version: model.version, name: model.name, status: model.status, description: model.description })}>编辑</button>
              </div>
              {variants.map((variant) => (
                <div className={styles.variantBlock} key={variant.id}>
                  <div className={styles.variantLine}>
                    <div><b>{variant.code}</b><span>{variant.name}</span><small>{statusLabel(variant.status)}</small></div>
                    <button onClick={() => setEdit({ entity: 'variant', id: variant.id, version: variant.version, name: variant.name, status: variant.status, description: variant.description })}>编辑</button>
                  </div>
                  <div className={styles.skuList}>
                    {catalog.skus.filter((sku) => sku.variant_id === variant.id).map((sku) => (
                      <div className={styles.sku} key={sku.id}>
                        <div>
                          <b>{sku.sku}</b>
                          <span>{sku.name}</span>
                          <small>{[sku.market_code, sku.color_code, sku.size_code].filter(Boolean).join(' · ') || '基础配置'} · {statusLabel(sku.status)}</small>
                        </div>
                        <button onClick={() => setEdit({ entity: 'sku', id: sku.id, version: sku.version, name: sku.name, status: sku.status, marketCode: sku.market_code, colorCode: sku.color_code, sizeCode: sku.size_code })}>编辑</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.formsGrid} id="configuration">
        <form onSubmit={(e) => void submitForm(e, '/v1/product/models', (f) => ({ platformId: f.get('platformId'), code: f.get('code'), name: f.get('name'), description: f.get('description') }))}>
          <span>新建车型</span><h3>创建车型</h3>
          <select name="platformId" required defaultValue=""><option value="" disabled>选择产品系列</option>{catalog.platforms.map((p) => <option key={p.id} value={p.id}>{p.code} · {platformName(p)}</option>)}</select>
          <input name="code" placeholder="例如：FC1" required />
          <input name="name" placeholder="车型名称" required />
          <input name="description" placeholder="车型说明" />
          <button>创建车型</button>
        </form>

        <form onSubmit={(e) => void submitForm(e, '/v1/product/variants', (f) => ({ modelId: f.get('modelId'), code: f.get('code'), name: f.get('name'), description: f.get('description') }))}>
          <span>新建商业版本</span><h3>创建 Variant</h3>
          <select name="modelId" required defaultValue=""><option value="" disabled>选择车型</option>{catalog.models.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}</select>
          <input name="code" placeholder="例如：PRO" required />
          <input name="name" placeholder="例如：Pro" required />
          <input name="description" placeholder="版本说明" />
          <button>创建版本</button>
        </form>

        <form onSubmit={(e) => void submitForm(e, '/v1/product/skus', (f) => ({ variantId: f.get('variantId'), sku: f.get('sku'), name: f.get('name'), marketCode: f.get('marketCode') || undefined, colorCode: f.get('colorCode') || undefined, sizeCode: f.get('sizeCode') || undefined }))}>
          <span>新建 SKU</span><h3>创建可销售身份</h3>
          <select name="variantId" required defaultValue=""><option value="" disabled>选择 Variant</option>{catalog.variants.map((v) => <option key={v.id} value={v.id}>{catalog.models.find((m) => m.id === v.model_id)?.code} · {v.code}</option>)}</select>
          <input name="sku" placeholder="例如：FC1-PRO-DE-BLK" required />
          <input name="name" placeholder="SKU 名称" required />
          <div className={styles.inline}><input name="marketCode" maxLength={2} placeholder="市场 DE" /><input name="colorCode" placeholder="颜色 BLACK" /><input name="sizeCode" placeholder="尺寸 20" /></div>
          <button>创建 SKU</button>
        </form>
      </section>

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
        <form onSubmit={(e) => void submitForm(e, '/v1/engineering/parts', (f) => ({ partNumber: f.get('partNumber'), name: f.get('name'), category: f.get('category'), defaultUnit: f.get('defaultUnit') }))}>
          <span>零部件主数据</span><h3>创建零部件</h3>
          <input name="partNumber" placeholder="例如：FRAME-FC1-001" required />
          <input name="name" placeholder="零部件名称" required />
          <div className={styles.inline}><input name="category" placeholder="分类 FRAME" /><input name="defaultUnit" placeholder="单位 EA" /></div>
          <button>创建零部件</button>
        </form>

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
