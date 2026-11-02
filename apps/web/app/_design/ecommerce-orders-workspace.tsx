'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import styles from './ecommerce-orders-workspace.module.css';

type Sku = { id: string; sku: string; name: string; colorCode: string | null; marketCode: string | null; modelCode: string; variantCode: string };
type Price = { id: string; skuId: string; sku: string; status: 'DRAFT' | 'ACTIVE' | 'RETIRED'; marketCountry: string; unitPriceGross: string; version: number };
type Line = { id: string; skuId: string; skuCode: string; skuName: string; quantity: number; lineGrossAmount: string; lineNetAmount: string; lineTaxAmount: string; taxRateBasisPoints: number };
type Order = { id: string; orderNumber: string; customerEmail: string; marketCountry: string; currency: string; status: string; paymentStatus: string; totalGrossAmount: string; totalTaxAmount: string; totalNetAmount: string; version: number; createdAt: string; lines: Line[]; blockers: string[] };
type OrderDetail = Order & { events: { id: string; eventType: string; fromStatus: string | null; toStatus: string; toPaymentStatus: string; occurredAt: string }[] };
type Factory = { id: string; code: string; name: string };
type Summary = { checkoutEnabled: false; skus: Sku[]; prices: Price[]; orders: Order[]; factories: Factory[]; orderTotal: number; orderLimit: number; orderStatusCounts: Record<string, number> };
type Item = { skuId: string; quantity: string };
type Tone = 'good' | 'warn' | 'bad' | 'brand' | 'neutral';

const statusLabel: Record<string, string> = { DRAFT: '内部草稿', SUBMITTED: '待支付', PAYMENT_PENDING: '支付处理中', PAYMENT_VERIFIED: '已核验付款', FULFILLMENT_PENDING: '待履约', IN_PRODUCTION: '生产中', FULFILLED: '已交付', CANCELLED: '已取消' };
const statusTone: Record<string, Tone> = { DRAFT: 'warn', SUBMITTED: 'brand', PAYMENT_PENDING: 'brand', PAYMENT_VERIFIED: 'good', FULFILLMENT_PENDING: 'brand', IN_PRODUCTION: 'brand', FULFILLED: 'good', CANCELLED: 'bad' };

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

function maskEmail(email: string): string {
  const [name = '', domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

type ColumnKey = 'goods' | 'customer' | 'amount' | 'status' | 'time';
const columnLabels: Record<ColumnKey, string> = { goods: '商品明细', customer: '客户与市场', amount: '金额', status: '状态与阻断', time: '下单时间' };
const defaultColumns: Record<ColumnKey, boolean> = { goods: true, customer: true, amount: true, status: true, time: true };
const columnStorageKey = 'alsvid.b2c-orders.columns.v1';

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map(row => row.map(cell => csvCell(cell)).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'BLOCKED'>('ALL');
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(defaultColumns);
  const [showColumns, setShowColumns] = useState(false);
  const requestKey = useRef<{ fingerprint: string; id: string } | null>(null);
  const initialised = useRef(false);
  const latestLoad = useRef(0);

  const load = useCallback(async (nextQuery = '', nextStatus = 'ALL', nextMarket = 'ALL') => {
    const request = ++latestLoad.current;
    setState('loading');
    setError('');
    try {
      const data = await storefrontApi<Summary>(summaryPath(nextQuery, nextStatus, nextMarket));
      if (request !== latestLoad.current) return;
      setSummary(data);
      setFactoryId(current => data.factories.some(factory => factory.id === current) ? current : data.factories[0]?.id ?? '');
      setItems(current => current.map(item => ({ ...item, skuId: data.skus.some(sku => sku.id === item.skuId) ? item.skuId : data.skus[0]?.id ?? '' })));
      setState('ready');
    } catch (reason) {
      if (request !== latestLoad.current) return;
      setError(reason instanceof Error ? reason.message : '订单数据读取失败');
      setState('error');
    }
  }, []);

  useEffect(() => { void load().finally(() => { initialised.current = true; }); }, [load]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(columnStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>;
      setColumns(current => {
        const next = { ...current };
        for (const key of Object.keys(defaultColumns) as ColumnKey[]) {
          if (typeof stored[key] === 'boolean') next[key] = stored[key] as boolean;
        }
        return next;
      });
    } catch { /* 本地列配置损坏时回退到默认列，不影响订单数据 */ }
  }, []);

  // Only filter changes trigger debounced reloads. Including request state here
  // creates an infinite ready -> loading -> ready polling loop on an idle page.
  useEffect(() => {
    if (!initialised.current) return;
    const timer = window.setTimeout(() => { void load(query, status, orderMarket); }, 300);
    return () => window.clearTimeout(timer);
  }, [load, orderMarket, query, status]);

  const activePrices = summary?.prices.filter(price => price.status === 'ACTIVE') ?? [];
  const availableSkus = summary?.skus.filter(sku => activePrices.some(price => price.skuId === sku.id && price.marketCountry === market)) ?? [];
  const canAddItem = availableSkus.some(sku => !items.some(item => item.skuId === sku.id));

  const statusCounts = summary?.orderStatusCounts ?? {};
  const blockedCount = useMemo(() => (summary ? summary.orders.filter(order => order.blockers.length > 0).length : 0), [summary]);

  const visibleOrders = useMemo(() => {
    if (!summary) return [];
    if (quickFilter === 'BLOCKED') return summary.orders.filter(order => order.blockers.length > 0);
    return summary.orders;
  }, [summary, quickFilter]);

  const allVisibleSelected = visibleOrders.length > 0 && visibleOrders.every(order => selected.has(order.id));

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
    await run(async () => { const order = await storefrontApi<Order>('orders', { ...payload, clientRequestId }); requestKey.current = null; setEmail(''); setItems([{ skuId: availableSkus[0]?.id ?? '', quantity: '1' }]); setShowCreate(false); return order; }, '内部订单草稿已保存；未收款、未提交给客户。');
  }

  async function openDetail(order: Order) { setBusy(true); setError(''); try { setDetail(await storefrontApi<OrderDetail>(`orders/${order.id}`)); } catch (reason) { setError(reason instanceof Error ? reason.message : '订单详情读取失败'); } finally { setBusy(false); } }

  function toggleOne(orderId: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  }

  function toggleAll() {
    setSelected(current => {
      if (visibleOrders.length > 0 && visibleOrders.every(order => current.has(order.id))) {
        const next = new Set(current);
        for (const order of visibleOrders) next.delete(order.id);
        return next;
      }
      const next = new Set(current);
      for (const order of visibleOrders) next.add(order.id);
      return next;
    });
  }

  async function batchSubmitDrafts() {
    if (!summary) return;
    const ids = [...selected].filter(id => summary.orders.find(order => order.id === id)?.status === 'DRAFT');
    if (!ids.length) return;
    await run(async () => {
      for (const id of ids) {
        const order = summary.orders.find(candidate => candidate.id === id);
        if (!order) continue;
        await storefrontApi(`orders/${id}/submit`, { expectedVersion: order.version });
      }
    }, `已批量提交 ${ids.length} 个内部草稿，等待支付通道接入。`);
    setSelected(new Set());
  }

  function resetFilters() {
    setQuery(''); setStatus('ALL'); setOrderMarket('ALL'); setQuickFilter('ALL');
  }

  function toggleColumn(key: ColumnKey) {
    setColumns(current => {
      const next = { ...current, [key]: !current[key] };
      if (!Object.values(next).some(Boolean)) return current;
      try { window.localStorage.setItem(columnStorageKey, JSON.stringify(next)); } catch { /* 隐私模式下无法持久化，仅当次生效 */ }
      return next;
    });
  }

  function exportOrders() {
    const source = selected.size > 0 ? visibleOrders.filter(order => selected.has(order.id)) : visibleOrders;
    if (!source.length) { setNotice('当前没有可导出的订单。'); return; }
    const header = ['订单号', '下单时间', '客户邮箱', '市场', '币种', '含税金额', '税额', '净额', '订单状态', '支付状态', '商品明细', '阻断项'];
    const rows = source.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toISOString(),
      maskEmail(order.customerEmail),
      order.marketCountry,
      order.currency,
      order.totalGrossAmount,
      order.totalTaxAmount,
      order.totalNetAmount,
      statusLabel[order.status] ?? order.status,
      order.paymentStatus,
      order.lines.map(line => `${line.skuCode} ${line.skuName} ×${line.quantity}`).join(' | '),
      order.blockers.join(' | '),
    ]);
    downloadCsv(`b2c-orders-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
    setError('');
    setNotice(`已导出 ${source.length} 条订单为 CSV（客户邮箱按界面一致脱敏）。`);
  }

  if (state === 'loading' && !summary) return <section className="av-card av-commerce-load-state" role="status"><strong>正在读取 B2C 订单…</strong><p>正在读取真实订单、SKU 和价格版本。</p></section>;
  if (state === 'error' && !summary) return <section className="av-card av-commerce-load-state" role="alert"><strong>B2C 订单暂不可用</strong><p>{error}。读取失败不代表没有订单。</p><button className="av-btn" type="button" onClick={() => void load()}>重新读取</button></section>;
  if (!summary) return null;

  return <div className={styles.workspace} id="b2c" aria-label="B2C 订单管理工作区">
    <section className="av-card">
      <div className="av-cardhead">
        <div>
          <p className="av-eyebrow">FIRST-PARTY COMMERCE · ORDERS</p>
          <h1 className="av-cardtitle">B2C 订单管理</h1>
          <p className="av-cardhint">订单使用商城交易域真实数据；支付、公开结账和自动库存预留仍受上线门禁约束。</p>
        </div>
        <div className="av-pageactions">
          <button className="av-btn" type="button" onClick={() => void load()} disabled={busy}>刷新</button>
          <a className="av-btn" href="/admin/ecommerce/products">商品列表</a>
          <button className="av-btn" data-variant="primary" type="button" onClick={() => setShowCreate(value => !value)} disabled={busy}>{showCreate ? '收起新建' : '新建订单'}</button>
        </div>
      </div>
      <div className={styles.statusTabs} role="tablist" aria-label="订单状态统计">
        <button type="button" role="tab" aria-selected={status === 'ALL'} className={styles.statTab} data-active={status === 'ALL'} onClick={() => setStatus('ALL')}>
          <strong>{summary.orderTotal}</strong><span>全部订单</span>
        </button>
        {Object.entries(statusCounts).map(([key, count]) => (
          <button type="button" key={key} role="tab" aria-selected={status === key} className={styles.statTab} data-active={status === key} data-tone={statusTone[key] ?? 'neutral'} onClick={() => setStatus(key)}>
            <strong>{count}</strong><span>{statusLabel[key] ?? key}</span>
          </button>
        ))}
      </div>
    </section>

    {error ? <p className="av-card av-inline-alert" role="alert">{error}</p> : null}
    {notice ? <p className="av-card av-inline-notice" role="status">{notice}</p> : null}

    {showCreate ? (
      <section className="av-card">
        <div className="av-cardhead"><div><h2 className="av-cardtitle">创建内部订单草稿</h2><p className="av-cardhint">只允许使用已有 SKU 和已启用市场价格；不会发起支付。</p></div><button className="av-btn" type="button" onClick={() => setShowCreate(false)}>关闭</button></div>
        <form className={styles.form} onSubmit={event => { void createOrder(event); }}>
          <label>客户邮箱<input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></label>
          <label>销售市场<select value={market} onChange={event => setMarket(event.target.value as 'DE' | 'AT')} disabled={busy}><option value="DE">德国 DE</option><option value="AT">奥地利 AT</option></select></label>
          <label>商品 SKU<select value={items[0]?.skuId ?? ''} onChange={event => setItems(current => [{ ...(current[0] ?? { skuId: '', quantity: '1' }), skuId: event.target.value }])} required disabled={busy || !availableSkus.length}><option value="">选择 SKU</option>{availableSkus.map(sku => <option key={sku.id} value={sku.id}>{sku.sku} · {sku.name}</option>)}</select></label>
          <label>数量<input type="number" min="1" max="1000" step="1" value={items[0]?.quantity ?? '1'} onChange={event => setItems(current => [{ ...(current[0] ?? { skuId: '', quantity: '1' }), quantity: event.target.value }])} required disabled={busy} /></label>
          <button className="av-btn" data-variant="primary" type="submit" disabled={busy || !email.trim() || !availableSkus.length || !items[0]?.skuId}>保存草稿</button>
        </form>
        {!availableSkus.length ? <p className="av-cardhint">当前市场没有已启用价格的 SKU，请先到商城价格管理配置。</p> : null}
      </section>
    ) : null}

    <section className="av-card" aria-label="订单列表" aria-busy={state === 'loading'}>
      <div className="av-cardhead">
        <div>
          <h2 className="av-cardtitle">订单列表</h2>
          <p className="av-cardhint">服务端匹配 {summary.orderTotal} 条，本次显示 {visibleOrders.length} 条{quickFilter === 'BLOCKED' ? '（仅含阻断项）' : ''}。</p>
        </div>
      </div>
      <div className={styles.toolbar}>
        <input className="av-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="订单号 / 客户邮箱 / SKU" type="search" />
        <select className="av-search av-ecommerce-select" value={orderMarket} onChange={event => setOrderMarket(event.target.value)}>
          <option value="ALL">全部市场</option>
          <option value="DE">DE</option>
          <option value="AT">AT</option>
        </select>
        <button className="av-btn" data-variant="primary" type="button" onClick={() => void load(query, status, orderMarket)} disabled={busy}>查询</button>
        <button className="av-btn" type="button" onClick={resetFilters} disabled={busy}>重置</button>
        <div className={styles.quickFilters}>
          <button type="button" className={styles.quickChip} data-active={quickFilter === 'ALL'} onClick={() => setQuickFilter('ALL')}>全部</button>
          <button type="button" className={styles.quickChip} data-active={quickFilter === 'BLOCKED'} onClick={() => setQuickFilter('BLOCKED')}>有阻断项 · {blockedCount}</button>
        </div>
      </div>

      <div className={styles.batchBar}>
        <label className={styles.batchSelectAll}><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={visibleOrders.length === 0} /> 全选</label>
        <span className={styles.batchCount}>已选 {selected.size} 条</span>
        <button className="av-btn" type="button" onClick={() => void batchSubmitDrafts()} disabled={busy || selected.size === 0}>批量提交草稿</button>
        <button className="av-btn" type="button" onClick={exportOrders} disabled={busy || visibleOrders.length === 0} title={selected.size > 0 ? `导出已选 ${selected.size} 条订单` : `导出当前筛选的 ${visibleOrders.length} 条订单`}>批量导出</button>
        <span className={styles.spacer} />
        <button className="av-btn" type="button" aria-expanded={showColumns} onClick={() => setShowColumns(value => !value)}>表格配置</button>
      </div>

      {showColumns ? <div className={styles.columnPanel} role="group" aria-label="订单列显示配置">
        <span className={styles.columnPanelLabel}>显示字段</span>
        {(Object.keys(columnLabels) as ColumnKey[]).map(key => (
          <label key={key} className={styles.columnOption} data-active={columns[key]}>
            <input type="checkbox" checked={columns[key]} onChange={() => toggleColumn(key)} /> {columnLabels[key]}
          </label>
        ))}
        <button className="av-btn" type="button" onClick={() => { setColumns(defaultColumns); try { window.localStorage.removeItem(columnStorageKey); } catch { /* 忽略 */ } }}>恢复默认</button>
      </div> : null}

      <div className="av-tablewrap">
        <table className="av-table" aria-label="B2C 订单列表">
          <thead><tr>
            <th scope="col">选择</th>
            <th scope="col">订单号</th>
            {columns.goods ? <th scope="col">商品明细</th> : null}
            {columns.customer ? <th scope="col">客户与市场</th> : null}
            {columns.amount || columns.status ? <th scope="col">金额与状态</th> : null}
            <th scope="col">操作</th>
          </tr></thead>
          <tbody>
            {visibleOrders.length === 0 ? (
              <tr><td colSpan={3 + Number(columns.goods) + Number(columns.customer) + Number(columns.amount || columns.status)} className="av-empty-state">当前没有符合筛选条件的订单。</td></tr>
            ) : visibleOrders.map(order => (
              <tr key={order.id} data-selected={selected.has(order.id)}>
                <td><input type="checkbox" aria-label={`选择订单 ${order.orderNumber}`} checked={selected.has(order.id)} onChange={() => toggleOne(order.id)} /></td>
                <td>
                  <strong className={styles.orderNo}>{order.orderNumber}</strong>
                  {columns.time ? <div className={styles.orderTime}>{new Date(order.createdAt).toLocaleString('zh-CN')}</div> : null}
                </td>
                {columns.goods ? <td>
                  {order.lines.length ? order.lines.map(line => <div key={line.id}>{line.skuName} · {line.skuCode} ×{line.quantity}</div>) : '—'}
                </td> : null}
                {columns.customer ? <td>{maskEmail(order.customerEmail)} <span className={styles.orderMarket}>{order.marketCountry}</span></td> : null}
                {columns.amount || columns.status ? <td>
                  {columns.amount ? <div><strong>{order.totalGrossAmount}</strong> {order.currency}</div> : null}
                  {columns.status ? <div>
                    <span className="av-tag" data-tone={statusTone[order.status] ?? 'neutral'}>{statusLabel[order.status] ?? order.status}</span>
                    {order.blockers.length > 0 ? <span className="av-tag" data-tone="bad">{order.blockers.length} 项阻断</span> : null}
                  </div> : null}
                </td> : null}
                <td>
                  <button className="av-btn" type="button" onClick={() => void openDetail(order)} disabled={busy}>订单详情</button>
                  {order.status === 'DRAFT' ? <button className="av-btn" type="button" onClick={() => void run(() => storefrontApi(`orders/${order.id}/submit`, { expectedVersion: order.version }), '订单已提交，等待支付通道接入。')} disabled={busy}>提交</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {detail ? <section className="av-card"><div className="av-cardhead"><div><h2 className="av-cardtitle">订单详情 · {detail.orderNumber}</h2><p className="av-cardhint">版本 V{detail.version} · {statusLabel[detail.status] ?? detail.status} · 支付 {detail.paymentStatus}</p></div><button className="av-btn" type="button" onClick={() => setDetail(null)}>收起</button></div><div className="av-tablewrap"><table className="av-table"><thead><tr><th>SKU</th><th>数量</th><th>净额</th><th>税额</th><th>含税</th></tr></thead><tbody>{detail.lines.map(line => <tr key={line.id}><td>{line.skuCode} · {line.skuName}</td><td>{line.quantity}</td><td>{line.lineNetAmount}</td><td>{line.lineTaxAmount}</td><td>{line.lineGrossAmount}</td></tr>)}</tbody></table></div><p className="av-cardhint">创建时间：{new Date(detail.createdAt).toLocaleString('zh-CN')} · 流转记录 {detail.events.length} 条</p></section> : null}
    <p className="av-cardhint">安全边界：订单初始为 DRAFT；当前界面不提供手动标记付款，也不会自动扣减仓库实物库存。</p>
  </div>;
}
