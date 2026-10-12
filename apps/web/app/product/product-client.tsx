'use client';

import { AppShell } from '@alsvid/ui';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { navigationFor } from '../app-navigation';
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
    if (response.status === 401) {
      router.push('/login');
      throw new Error('登录状态已过期，请重新登录');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function reload() {
    try {
      const [nextCatalog, nextEngineering] = await Promise.all([
        api('/v1/product/catalog'),
        api('/v1/engineering'),
      ]);
      setCatalog(nextCatalog);
      setEngineering(nextEngineering);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法加载产品与工程工作台');
    }
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
      setMessage('已保存。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    }
  }

  async function release(endpoint: string) {
    try {
      await api(endpoint, { method: 'POST', body: '{}' });
      setMessage('已发布。该工程版本进入不可静默修改状态。');
      await reload();
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
      setMessage('产品信息已更新。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新失败');
    }
  }

  return (
    <AppShell navigation={navigationFor('/product')} footer="产品 / 工程 / 资产">
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>ALSVID PRODUCT CENTER</div>
          <h1>ALSVID 产品中心</h1>
          <p>从产品系列、车型配置到 SKU、BOM 与生产规格，统一管理 ALSVID 的核心产品资产。商业产品身份与工程发布事实保持清晰分层。</p>
        </div>
        <div className={styles.releaseBadge}>产品主数据 · 工程控制</div>
      </header>

      {message ? <div className={styles.notice}>{message}</div> : null}

      <div className={styles.metrics} aria-label="产品数据概览">
        <div><span>产品系列</span><strong>{catalog.platforms.length}</strong></div>
        <div><span>车型</span><strong>{catalog.models.length}</strong></div>
        <div><span>Variant</span><strong>{catalog.variants.length}</strong></div>
        <div><span>SKU</span><strong>{catalog.skus.length}</strong></div>
        <div><span>BOM</span><strong>{engineering.boms.length}</strong></div>
        <div><span>零部件</span><strong>{engineering.parts.length}</strong></div>
      </div>

      <section className={styles.seriesSection} id="series">
        <div className={styles.sectionHead}>
          <div><span>PRODUCT SERIES</span><h2>产品系列</h2></div>
          <p>界面使用“产品系列”作为业务语言；底层仍保留受控 Platform → Model → Variant → SKU 产品层级。</p>
        </div>
        <div className={styles.platforms}>
          {catalog.platforms.map((platform) => (
            <article key={platform.id}>
              <span>{platform.code}</span>
              <h2>{platform.name}</h2>
              <p>{platform.description}</p>
              <small>{catalog.models.filter((model) => model.platform_id === platform.id).length} 个车型</small>
            </article>
          ))}
          {!catalog.platforms.length ? <div className={styles.emptySeries}>暂无产品系列数据</div> : null}
        </div>
      </section>

      <section className={styles.section} id="models">
        <div className={styles.sectionHead}>
          <div><span>产品层级</span><h2>车型 → Variant → SKU</h2></div>
          <p>产品系列和车型是 ALSVID 的产品主数据。Shopify 等外部销售渠道只能映射 SKU，不能定义这里的产品真相。</p>
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
          <select name="platformId" required defaultValue=""><option value="" disabled>选择产品系列</option>{catalog.platforms.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select>
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
            {!engineering.parts.length ? <small>暂无零部件</small> : null}
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
            {!engineering.buildSpecs.length ? <small>暂无生产规格</small> : null}
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
    </AppShell>
  );
}
