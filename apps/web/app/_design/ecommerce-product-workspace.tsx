'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CatalogPublicationPanel } from '../product/catalog-publication-panel';

type Model = { id: string; code: string; name: string; description: string; status: string; updated_at: string; platform_id: string | null; product_type_code: string };
type Variant = { id: string; model_id: string; code: string; name: string; status: string };
type Sku = { id: string; variant_id: string; sku: string; name: string; status: string; market_code: string | null; color_code: string | null; size_code: string | null };
type Platform = { id: string; code: string; name: string };
type Catalog = { models: Model[]; variants: Variant[]; skus: Sku[]; platforms: Platform[] };
type Publication = { model_id: string; model_code: string; status: string; title_zh: string; title_de: string; title_en: string; image_path: string; version: number; published_at: string | null; withdrawn_at: string | null };
type Price = { id: string; skuId: string; sku: string; skuName: string; marketCountry: string; currency: string; unitPriceGross: string; status: string; effectiveFrom: string | null };
type Summary = { skus: { id: string; sku: string; name: string; modelCode: string; variantCode: string }[]; prices: Price[]; orders: { id: string; orderNumber: string; status: string; marketCountry: string; totalGrossAmount: string; createdAt: string }[]; orderTotal: number; orderStatusCounts: Record<string, number> };
type Stock = { item_kind: string; sku_id: string | null; sku: string | null; sku_name: string | null; warehouse_code: string; warehouse_name: string; location_code: string; on_hand: string; reserved: string; available: string; frame_number: string | null };
type ProductData = { catalog: Catalog; publications: Publication[]; summary: Summary; inventory: Stock[] };

const publicationLabel: Record<string, string> = { DRAFT: '草稿', IN_REVIEW: '待审核', PUBLISHED: '已上架', WITHDRAWN: '已下架' };
const productTypeLabel: Record<string, string> = { BIKE: '整车', ACCESSORY: '零配件', SERVICE_PART: '服务件' };

async function readApi<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请重新登录' : response.status === 403 ? '当前账号没有商城数据读取权限' : payload?.message ?? '商城数据读取失败');
  if (!payload || !('data' in payload)) throw new Error('商城接口返回格式异常');
  return payload.data as T;
}

function money(value: string | undefined, currency = 'EUR') {
  if (!value) return '未配置';
  return `${value} ${currency}`;
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('zh-CN') : '—';
}

export function EcommerceProductWorkspace() {
  const [data, setData] = useState<ProductData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [market, setMarket] = useState('ALL');
  const [selectedId, setSelectedId] = useState('');

  async function load() {
    setState('loading');
    setError('');
    try {
      const [catalog, publications, summary, inventory] = await Promise.all([
        readApi<Catalog>('/api/control/v1/product/catalog'),
        readApi<Publication[]>('/api/control/v1/product/publications'),
        readApi<Summary>('/api/control/v1/commerce/storefront/summary'),
        readApi<{ balances: Stock[] }>('/api/control/v1/inventory'),
      ]);
      setData({ catalog, publications, summary, inventory: inventory.balances });
      setState('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '商城数据读取失败');
      setState('error');
    }
  }

  useEffect(() => {
    const modelId = new URLSearchParams(window.location.search).get('modelId') ?? '';
    setSelectedId(modelId);
    void load();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const term = query.trim().toLocaleLowerCase();
    return data.catalog.models.filter(model => {
      const publication = data.publications.find(item => item.model_id === model.id);
      const modelSkus = data.catalog.skus.filter(sku => data.catalog.variants.find(variant => variant.id === sku.variant_id)?.model_id === model.id);
      const modelPrices = data.summary.prices.filter(price => modelSkus.some(sku => sku.id === price.skuId));
      const matchesSearch = !term || [model.code, model.name, model.description, ...modelSkus.flatMap(sku => [sku.sku, sku.name])].some(value => value.toLocaleLowerCase().includes(term));
      const matchesType = type === 'ALL' || model.product_type_code === type;
      const matchesStatus = status === 'ALL' || (publication?.status ?? 'UNLISTED') === status;
      const matchesMarket = market === 'ALL' || modelPrices.some(price => price.marketCountry === market);
      return matchesSearch && matchesType && matchesStatus && matchesMarket;
    });
  }, [data, market, query, status, type]);

  const selected = data?.catalog.models.find(model => model.id === selectedId) ?? null;

  function selectModel(id: string) {
    setSelectedId(id);
    window.history.replaceState({}, '', `/admin/ecommerce/products?modelId=${encodeURIComponent(id)}`);
  }

  if (state === 'loading') return <section className="av-card av-commerce-load-state" role="status"><strong>正在读取商城商品资料…</strong><p>正在合并产品中心、商城价格、库存台账和发布审核数据。</p></section>;
  if (state === 'error') return <section className="av-card av-commerce-load-state" role="alert"><strong>商城商品资料暂不可用</strong><p>{error}。读取失败不代表没有商品或库存。</p><button className="av-btn" type="button" onClick={() => void load()}>重新读取</button></section>;
  if (!data) return null;

  return <div className="av-ecommerce-products">
    <section className="av-card av-ecommerce-list-card" aria-label="商城商品列表">
      <div className="av-cardhead"><div><p className="av-eyebrow">PRODUCT CATALOGUE · STOREFRONT</p><h2 className="av-cardtitle">商城商品列表</h2><p className="av-cardhint">商品主数据来自产品研发；价格、库存和发布状态分别来自各自业务域。</p></div><div className="av-pageactions"><button className="av-btn" type="button" onClick={() => void load()}>刷新</button><a className="av-btn" data-variant="primary" href="/admin/product?type=BIKE#vehicle-models">从产品中心新增</a></div></div>
      <div className="av-toolbar av-ecommerce-filterbar"><input className="av-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索商品名称、车型编码、商品编码或 SKU" type="search" /><select className="av-search av-ecommerce-select" value={type} onChange={event => setType(event.target.value)}><option value="ALL">全部商品类型</option><option value="BIKE">整车</option><option value="ACCESSORY">零配件</option><option value="SERVICE_PART">服务件</option></select><select className="av-search av-ecommerce-select" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">全部销售状态</option><option value="UNLISTED">未建立发布记录</option><option value="DRAFT">草稿</option><option value="IN_REVIEW">待审核</option><option value="PUBLISHED">已上架</option><option value="WITHDRAWN">已下架</option></select><select className="av-search av-ecommerce-select" value={market} onChange={event => setMarket(event.target.value)}><option value="ALL">全部市场</option><option value="DE">DE</option><option value="AT">AT</option></select></div>
      <div className="av-ecommerce-list-meta">真实产品 {data.catalog.models.length} 条 · 当前显示 {rows.length} 条</div>
      <div className="av-tablewrap"><table className="av-table av-ecommerce-product-table"><thead><tr><th>商品</th><th>产品类型</th><th>SKU</th><th>销售市场 / 价格</th><th>可用库存</th><th>销售状态</th><th>最近更新</th><th>操作</th></tr></thead><tbody>{rows.map(model => <ProductRow key={model.id} model={model} data={data} onSelect={selectModel} selected={model.id === selectedId} />)}</tbody></table></div>
      {!rows.length ? <p className="av-empty-state">没有匹配的商品。筛选结果为零不代表真实商品数量为零。</p> : null}
    </section>
    {selected ? <ProductConfiguration model={selected} data={data} /> : <section className="av-card av-ecommerce-detail-empty"><strong>选择商品查看配置工作区</strong><p>点击列表中的商品名称或“配置”后，在当前页面展开商城展示、SKU、区域价格、库存和发布审核信息。</p></section>}
  </div>;
}

function ProductRow({ model, data, onSelect, selected }: { model: Model; data: ProductData; onSelect: (id: string) => void; selected: boolean }) {
  const publication = data.publications.find(item => item.model_id === model.id);
  const variants = data.catalog.variants.filter(item => item.model_id === model.id);
  const skus = data.catalog.skus.filter(item => variants.some(variant => variant.id === item.variant_id));
  const prices = data.summary.prices.filter(item => skus.some(sku => sku.id === item.skuId));
  const stock = data.inventory.filter(item => item.item_kind === 'SKU' && skus.some(sku => sku.id === item.sku_id));
  const available = stock.reduce((total, item) => total + Number(item.available || 0), 0);
  const href = `/admin/ecommerce/products?modelId=${encodeURIComponent(model.id)}`;
  return <tr data-selected={selected}>
    <td><a className="av-ecommerce-product-link" href={href} onClick={() => onSelect(model.id)}><strong>{publication?.title_zh || model.name || model.code}</strong><span>{model.code} · {model.id}</span></a></td>
    <td>{productTypeLabel[model.product_type_code] ?? model.product_type_code}</td>
    <td>{skus.length}<span className="av-table-subtext">{skus.slice(0, 2).map(item => item.sku).join('、') || '尚未建立 SKU'}</span></td>
    <td>{prices.length ? prices.slice(0, 3).map(price => <span className="av-table-subtext" key={price.id}>{price.marketCountry} · {money(price.unitPriceGross, price.currency)}</span>) : <span className="av-table-subtext">未配置市场价格</span>}</td>
    <td>{stock.length ? available.toLocaleString('zh-CN') : '未接入'}<span className="av-table-subtext">{stock.length ? '台账可用量' : '无库存记录'}</span></td>
    <td><span className="av-tag" data-tone={publication?.status === 'PUBLISHED' ? 'good' : publication?.status === 'IN_REVIEW' ? 'warn' : undefined}>{publication ? publicationLabel[publication.status] ?? publication.status : '未建立发布记录'}</span></td>
    <td>{date(model.updated_at)}</td>
    <td><button className="av-btn" type="button" onClick={() => onSelect(model.id)}>配置</button></td>
  </tr>;
}

function ProductConfiguration({ model, data }: { model: Model; data: ProductData }) {
  const publication = data.publications.find(item => item.model_id === model.id);
  const variants = data.catalog.variants.filter(item => item.model_id === model.id);
  const skus = data.catalog.skus.filter(item => variants.some(variant => variant.id === item.variant_id));
  const prices = data.summary.prices.filter(item => skus.some(sku => sku.id === item.skuId));
  const stock = data.inventory.filter(item => item.item_kind === 'SKU' && skus.some(sku => sku.id === item.sku_id));
  const platform = data.catalog.platforms.find(item => item.id === model.platform_id);
  return <section className="av-card av-ecommerce-config" aria-label={`${model.code} 商品配置工作区`}>
    <div className="av-cardhead"><div><p className="av-eyebrow">商品配置工作区 · {model.code}</p><h2 className="av-cardtitle">{publication?.title_zh || model.name}</h2><p className="av-cardhint">{model.code} · {productTypeLabel[model.product_type_code] ?? model.product_type_code} · {platform?.name || platform?.code || '未关联技术平台'}</p></div><div className="av-pageactions"><a className="av-btn" href="/admin/ecommerce/publications">发布与审核</a><a className="av-btn" href={`/admin/ecommerce/pricing?skuId=${encodeURIComponent(skus[0]?.id ?? '')}`}>价格管理</a><a className="av-btn" href="/admin/ecommerce/inventory">库存查询</a></div></div>
    <div className="av-ecommerce-config-grid">
      <ConfigSection number="01" title="商城展示信息" hint="商品标题、素材和审核动作直接复用现有商品发布流程。"><dl className="av-ecommerce-facts"><div><dt>中文展示名称</dt><dd>{publication?.title_zh || '尚未建立发布记录'}</dd></div><div><dt>德语 / 英文标题</dt><dd>{publication ? `${publication.title_de || '未填写'} / ${publication.title_en || '未填写'}` : '—'}</dd></div><div><dt>主图</dt><dd>{publication?.image_path || '未核对素材'}</dd></div><div><dt>发布状态</dt><dd><span className="av-tag" data-tone={publication?.status === 'PUBLISHED' ? 'good' : undefined}>{publication ? publicationLabel[publication.status] ?? publication.status : '未建立发布记录'}</span></dd></div></dl><div className="av-ecommerce-embedded-publication"><CatalogPublicationPanel models={[model]} /></div></ConfigSection>
      <ConfigSection number="02" title="产品与 SKU" hint="车型、技术参数和正式 SKU 只读自产品研发。"><div className="av-tablewrap"><table className="av-table"><thead><tr><th>SKU</th><th>名称</th><th>Variant</th><th>市场 / 颜色 / 尺寸</th></tr></thead><tbody>{skus.map(sku => <tr key={sku.id}><td><strong>{sku.sku}</strong></td><td>{sku.name}</td><td>{variants.find(variant => variant.id === sku.variant_id)?.code || '—'}</td><td>{[sku.market_code, sku.color_code, sku.size_code].filter(Boolean).join(' · ') || '—'}</td></tr>)}</tbody></table></div>{!skus.length ? <p className="av-cardhint">该商品尚未建立 SKU。</p> : null}</ConfigSection>
      <ConfigSection number="03" title="区域与价格" hint="每个国家市场独立读取价格版本，不跨市场覆盖。"><div className="av-tablewrap"><table className="av-table"><thead><tr><th>SKU</th><th>市场</th><th>商城售价</th><th>状态</th><th>生效时间</th></tr></thead><tbody>{prices.map(price => <tr key={price.id}><td>{price.sku}</td><td>{price.marketCountry}</td><td>{money(price.unitPriceGross, price.currency)}</td><td>{price.status}</td><td>{date(price.effectiveFrom)}</td></tr>)}</tbody></table></div>{!prices.length ? <p className="av-cardhint">尚未配置商城价格。</p> : null}</ConfigSection>
      <ConfigSection number="04" title="库存与销售状态" hint="库存只读自库存台账；商城不直接修改仓库实物库存。"><div className="av-tablewrap"><table className="av-table"><thead><tr><th>SKU</th><th>仓库 / 库位</th><th>现存</th><th>已预留</th><th>台账可用</th></tr></thead><tbody>{stock.map((item, index) => <tr key={`${item.sku_id}-${item.warehouse_code}-${item.location_code}-${index}`}><td>{item.sku || item.sku_name || '—'}</td><td>{item.warehouse_name || item.warehouse_code} / {item.location_code}</td><td>{item.on_hand}</td><td>{item.reserved}</td><td>{item.available}</td></tr>)}</tbody></table></div>{!stock.length ? <p className="av-cardhint">当前没有匹配的 SKU 库存记录；这不等于商城缺货。</p> : null}<p className="av-cardhint">正式商城可售量还需要 ATP、市场和履约规则，当前不在此处推断。</p></ConfigSection>
      <ConfigSection number="05" title="发布与审核记录" hint="当前展示授权 API 返回的正式发布状态。"><dl className="av-ecommerce-facts"><div><dt>审核状态</dt><dd>{publication ? publicationLabel[publication.status] ?? publication.status : '未建立发布记录'}</dd></div><div><dt>版本</dt><dd>{publication?.version ?? '—'}</dd></div><div><dt>上架时间</dt><dd>{date(publication?.published_at)}</dd></div><div><dt>撤回时间</dt><dd>{date(publication?.withdrawn_at)}</dd></div></dl><p className="av-cardhint">完整操作审计由产品发布域保留；此处不复制一套审核记录。</p></ConfigSection>
    </div>
  </section>;
}

function ConfigSection({ number, title, hint, children }: { number: string; title: string; hint: string; children: ReactNode }) {
  return <section className="av-ecommerce-config-section"><div className="av-ecommerce-config-heading"><span>{number}</span><div><h3>{title}</h3><p>{hint}</p></div></div>{children}</section>;
}

