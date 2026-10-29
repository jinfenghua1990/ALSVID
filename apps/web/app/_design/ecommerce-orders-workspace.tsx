'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './ecommerce-orders-workspace.module.css';

type Sku = { id: string; sku: string; name: string; colorCode: string | null; marketCode: string | null; modelCode: string; variantCode: string };
type Price = { id: string; skuId: string; sku: string; status: 'DRAFT' | 'ACTIVE' | 'RETIRED'; marketCountry: string; unitPriceGross: string; version: number };
type Line = { id: string; skuId: string; skuCode: string; skuName: string; quantity: number; lineGrossAmount: string; lineNetAmount: string; lineTaxAmount: string; taxRateBasisPoints: number };
type Order = { id: string; orderNumber: string; customerEmail: string; marketCountry: string; currency: string; status: string; paymentStatus: string; totalGrossAmount: string; totalTaxAmount: string; totalNetAmount: string; version: number; createdAt: string; lines: Line[]; blockers: string[] };
type OrderDetail = Order & { events: { id: string; eventType: string; fromStatus: string | null; toStatus: string; toPaymentStatus: string; occurredAt: string }[] };
type Factory = { id: string; code: string; name: string };
type Summary = { checkoutEnabled: false; skus: Sku[]; prices: Price[]; orders: Order[]; factories: Factory[]; orderTotal: number; orderLimit: number; orderStatusCounts: Record<string, number> };
type Item = { skuId: string; quantity: string };

const statusLabel: Record<string, string> = { DRAFT: '内部草稿', SUBMITTED: '待支付', PAYMENT_PENDING: '支付处理中', PAYMENT_VERIFIED: '已核验付款', FULFILLMENT_PENDING: '待履约', IN_PRODUCTION: '生产中', FULFILLED: '已交付', CANCELLED: '已取消' };

async function storefrontApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/control/v1/commerce/storefront/${path}`, { cache: 'no-store', method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请重新登录' : response.status === 403 ? '当前账号没有订单管理权限' : payload?.message ?? '订单接口操作失败');
  if (!payload || !('data' in payload)) throw new Error('订单接口返回格式异常');
  return payload.data as T;
}

async function productionApi<T>(orderId: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/control/v1/production/orders/from-storefront/${orderId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(response.status === 403 ? '当前账号没有创建生产需求的权限' : payload?.message ?? '生产需求接口操作失败');
  if (!payload || !('data' in payload)) throw new Error('生产需求接口返回格式异常');
  return payload.data as T;
}

function summaryPath(query: string, status: string, market: string) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('query', query.trim().slice(0, 100));
  if (status !== 'ALL') params.set('status', status);
  if (market !== 'ALL') params.set('marketCountry', market);
  const value = params.toString();
  return `summary${value ? `?${value}` : ''}`;
}

export function EcommerceOrdersWorkspace() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [orderMarket, setOrderMarket] = useState('ALL');
  const [market, setMarket] = useState<'DE' | 'AT'>('DE');
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<Item[]>([{ skuId: '', quantity: '1' }]);
  const [factoryId, setFactoryId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const requestKey = useRef<{ fingerprint: string; id: string } | null>(null);
  const initialised = useRef(false);

  const load = useCallback(async (nextQuery = '', nextStatus = 'ALL', nextMarket = 'ALL') => {
    setState('loading');
    setError('');
    try {
      const data = await storefrontApi<Summary>(summaryPath(nextQuery, nextStatus, nextMarket));
      setSummary(data);
      setFactoryId(current => data.factories.some(factory => factory.id === current) ? current : data.factories[0]?.id ?? '');
      setItems(current => current.map(item => ({ ...item, skuId: data.skus.some(sku => sku.id === item.skuId) ? item.skuId : data.skus[0]?.id ?? '' })));
      setState('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '订单数据读取失败');
      setState('error');
    }
  }, []);

  useEffect(() => { void load().finally(() => { initialised.current = true; }); }, [load]);

  useEffect(() => {
    if (!initialised.current || state !== 'ready') return;
    const timer = window.setTimeout(() => { void load(query, status, orderMarket); }, 300);
    return () => window.clearTimeout(timer);
  }, [load, orderMarket, query, state, status]);

  const activePrices = summary?.prices.filter(price => price.status === 'ACTIVE') ?? [];
  const availableSkus = summary?.skus.filter(sku => activePrices.some(price => price.skuId === sku.id && price.marketCountry === market)) ?? [];
  const canAddItem = availableSkus.some(sku => !items.some(item => item.skuId === sku.id));

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); await load(query, status, orderMarket); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '订单操作失败'); }
    finally { setBusy(false); }
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { customerEmail: email.trim().toLowerCase(), marketCountry: market, items: items.map(item => ({ skuId: item.skuId, quantity: Number(item.quantity) })) };
    const fingerprint = JSON.stringify(payload);
    const clientRequestId = requestKey.current?.fingerprint === fingerprint ? requestKey.current.id : crypto.randomUUID();
    requestKey.current = { fingerprint, id: clientRequestId };
    await run(async () => { const order = await storefrontApi<Order>('orders', { ...payload, clientRequestId }); requestKey.current = null; setEmail(''); setItems([{ skuId: availableSkus[0]?.id ?? '', quantity: '1' }]); return order; }, '内部订单草稿已保存；未收款、未提交给客户。');
  }

  async function openDetail(order: Order) { setBusy(true); setError(''); try { setDetail(await storefrontApi<OrderDetail>(`orders/${order.id}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : '订单详情读取失败'); } finally { setBusy(false); } }

  if (state === 'loading' && !summary) return <section className="av-card av-commerce-load-state" role="status"><strong>正在读取 B2C 订单…</strong><p>正在读取真实订单、SKU 和价格版本。</p></section>;
  if (state === 'error' && !summary) return <section className="av-card av-commerce-load-state" role="alert"><strong>B2C 订单暂不可用</strong><p>{error}。读取失败不代表没有订单。</p><button className="av-btn" type="button" onClick={() => void load()}>重新读取</button></section>;
  if (!summary) return null;

  return <div className={styles.workspace} id="b2c" aria-label="B2C 订单管理工作区">
    <section className="av-card"><div className="av-cardhead"><div><p className="av-eyebrow">FIRST-PARTY COMMERCE · ORDERS</p><h1 className="av-cardtitle">B2C 订单管理</h1><p className="av-cardhint">订单使用商城交易域真实数据；支付、公开结账和自动库存预留仍受上线门禁约束。</p></div><div className="av-pageactions"><button className="av-btn" type="button" onClick={() => void load()} disabled={busy}>刷新</button><a className="av-btn" href="/admin/ecommerce/products">商品列表</a></div></div><div className={styles.kpis}><div><span>订单总数</span><strong>{summary.orderTotal}</strong></div><div><span>本次加载</span><strong>{summary.orders.length}</strong></div><div><span>结账状态</span><strong>未开放</strong></div></div></section>
    {error ? <p className="av-card av-inline-alert" role="alert">{error}</p> : null}{notice ? <p className="av-card av-inline-notice" role="status">{notice}</p> : null}
    <section className="av-card"><div className="av-cardhead"><div><h2 className="av-cardtitle">创建内部订单草稿</h2><p className="av-cardhint">只允许使用已有 SKU 和已启用市场价格；不会发起支付。</p></div></div><form className={styles.form} onSubmit={event => { void createOrder(event); }}><label>客户邮箱<input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></label><label>销售市场<select value={market} onChange={event => setMarket(event.target.value as 'DE' | 'AT')} disabled={busy}><option value="DE">德国 DE</option><option value="AT">奥地利 AT</option></select></label><label>商品 SKU<select value={items[0]?.skuId ?? ''} onChange={event => setItems(current => [{ ...(current[0] ?? { skuId: '', quantity: '1' }), skuId: event.target.value }])} required disabled={busy || !availableSkus.length}><option value="">选择 SKU</option>{availableSkus.map(sku => <option key={sku.id} value={sku.id}>{sku.sku} · {sku.name}</option>)}</select></label><label>数量<input type="number" min="1" max="1000" step="1" value={items[0]?.quantity ?? '1'} onChange={event => setItems(current => [{ ...(current[0] ?? { skuId: '', quantity: '1' }), quantity: event.target.value }])} required disabled={busy} /></label><button className="av-btn" data-variant="primary" type="submit" disabled={busy || !email.trim() || !availableSkus.length || !items[0]?.skuId}>保存草稿</button></form>{!availableSkus.length ? <p className="av-cardhint">当前市场没有已启用价格的 SKU，请先到商城价格管理配置。</p> : null}</section>
    <section className="av-card"><div className="av-cardhead"><div><h2 className="av-cardtitle">订单列表</h2><p className="av-cardhint">服务端匹配 {summary.orderTotal} 条，本次显示 {summary.orders.length} 条。</p></div></div><div className="av-toolbar"><input className="av-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="订单号 / 客户邮箱 / SKU" type="search" /><select className="av-search av-ecommerce-select" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">全部状态</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select className="av-search av-ecommerce-select" value={orderMarket} onChange={event => setOrderMarket(event.target.value)}><option value="ALL">全部市场</option><option value="DE">DE</option><option value="AT">AT</option></select></div><div className="av-tablewrap"><table className="av-table"><thead><tr><th>订单号</th><th>客户 / 市场</th><th>商品</th><th>金额</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{summary.orders.map(order => <tr key={order.id}><td><strong>{order.orderNumber}</strong></td><td>{order.customerEmail}<span className="av-table-subtext">{order.marketCountry}</span></td><td>{order.lines.map(line => `${line.skuCode} × ${line.quantity}`).join('，') || '—'}</td><td>{order.totalGrossAmount} {order.currency}</td><td><span className="av-tag">{statusLabel[order.status] ?? order.status}</span></td><td>{new Date(order.createdAt).toLocaleString('zh-CN')}</td><td><div className={styles.actions}><button className="av-btn" type="button" onClick={() => void openDetail(order)} disabled={busy}>详情</button>{order.status === 'DRAFT' ? <button className="av-btn" type="button" onClick={() => void run(() => storefrontApi(`orders/${order.id}/submit`, { expectedVersion: order.version }), '订单已提交，等待支付通道接入。')} disabled={busy}>提交</button> : null}</div></td></tr>)}</tbody></table></div>{!summary.orders.length ? <p className="av-empty-state">当前没有符合筛选条件的第一方订单。</p> : null}</section>
    {detail ? <section className="av-card"><div className="av-cardhead"><div><h2 className="av-cardtitle">订单详情 · {detail.orderNumber}</h2><p className="av-cardhint">版本 V{detail.version} · {statusLabel[detail.status] ?? detail.status} · 支付 {detail.paymentStatus}</p></div><button className="av-btn" type="button" onClick={() => setDetail(null)}>收起</button></div><div className="av-tablewrap"><table className="av-table"><thead><tr><th>SKU</th><th>数量</th><th>净额</th><th>税额</th><th>含税</th></tr></thead><tbody>{detail.lines.map(line => <tr key={line.id}><td>{line.skuCode} · {line.skuName}</td><td>{line.quantity}</td><td>{line.lineNetAmount}</td><td>{line.lineTaxAmount}</td><td>{line.lineGrossAmount}</td></tr>)}</tbody></table></div><p className="av-cardhint">创建时间：{new Date(detail.createdAt).toLocaleString('zh-CN')} · 流转记录 {detail.events.length} 条</p></section> : null}
    <p className="av-cardhint">安全边界：订单初始为 DRAFT；当前界面不提供手动标记付款，也不会自动扣减仓库实物库存。</p>
  </div>;
}

