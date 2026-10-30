'use client';

import { useEffect, useState } from 'react';

type Sku = { id: string; sku: string; name: string; colorCode: string | null };
type Price = { id: string; skuId: string; sku: string; skuName: string; marketCountry: string; currency: string; unitPriceGross: string; taxRateBasisPoints: number; status: 'DRAFT' | 'ACTIVE' | 'RETIRED'; version: number; effectiveFrom: string | null; retiredAt: string | null };
type Summary = { skus: Sku[]; prices: Price[] };

async function commerceApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/control/v1/commerce/storefront/${path}`, {
    cache: 'no-store',
    method: body === undefined ? 'GET' : 'POST',
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请重新登录' : response.status === 403 ? '当前账号没有价格管理权限' : payload?.message ?? '价格接口操作失败');
  if (!payload || !('data' in payload)) throw new Error('价格接口返回格式异常');
  return payload.data as T;
}

export function EcommercePricingWorkspace({ skuIds, embedded = false, onChanged }: { skuIds?: string[]; embedded?: boolean; onChanged?: () => Promise<void> } = {}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [skuId, setSkuId] = useState('');
  const [market, setMarket] = useState<'DE' | 'AT'>('DE');
  const [gross, setGross] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setState('loading');
    setError('');
    try {
      const data = await commerceApi<Summary>('summary');
      setSummary(data);
      const requestedSku = new URLSearchParams(window.location.search).get('skuId') ?? '';
      const choices = skuIds ? data.skus.filter(sku => skuIds.includes(sku.id)) : data.skus;
      setSkuId(current => choices.some(sku => sku.id === current) ? current : choices.some(sku => sku.id === requestedSku) ? requestedSku : choices[0]?.id ?? '');
      setState('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '价格数据读取失败');
      setState('error');
    }
  }

  useEffect(() => { void load(); }, []);

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      await load();
      await onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '价格操作失败');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <section className="av-card av-commerce-load-state" role="status"><strong>正在读取价格版本…</strong><p>正在读取真实 SKU 和 DE / AT 价格数据。</p></section>;
  if (state === 'error') return <section className="av-card av-commerce-load-state" role="alert"><strong>价格数据暂不可用</strong><p>{error}。失败不代表没有价格。</p><button className="av-btn" type="button" onClick={() => void load()}>重新读取</button></section>;
  if (!summary) return null;
  const visibleSkus = skuIds ? summary.skus.filter(sku => skuIds.includes(sku.id)) : summary.skus;
  const visiblePrices = skuIds ? summary.prices.filter(price => skuIds.includes(price.skuId)) : summary.prices;

  return <div className="av-commerce-workspace" aria-label="商城价格管理工作区">
    {!embedded ? (
    <section className="av-card av-commerce-dashboard-head"><div><p className="av-eyebrow">PRICE MANAGEMENT · DE / AT</p><h1 className="av-cardtitle">商城价格管理</h1><p>按 SKU 和销售市场维护独立价格版本。价格数据归商城交易域，产品名称和 SKU 归产品研发。</p></div><div className="av-pageactions"><button className="av-btn" type="button" onClick={() => void load()} disabled={busy}>刷新</button><a className="av-btn" href="/admin/ecommerce/products">返回商城商品列表</a></div></section>
    ) : null}
    {error ? <p className="av-card av-inline-alert" role="alert">{error}</p> : null}
    {notice ? <p className="av-card av-inline-notice" role="status">{notice}</p> : null}
    <section className="av-card" aria-label="新增价格版本"><div className="av-cardhead"><div><h2 className="av-cardtitle">新增价格版本</h2><p className="av-cardhint">先保存草稿，再单独启用；DE 和 AT 价格互不覆盖。</p></div></div><form className="av-ecommerce-price-form" onSubmit={event => { event.preventDefault(); void run(async () => { await commerceApi<Price>('prices', { skuId, marketCountry: market, unitPriceGross: gross.trim(), taxRateBasisPoints: Number(taxRate) }); setGross(''); setTaxRate(''); }, '价格草稿已保存，请核对后启用。'); }}><label>商品 SKU<select value={skuId} onChange={event => setSkuId(event.target.value)} required disabled={busy || !visibleSkus.length}><option value="" disabled>选择 SKU</option>{visibleSkus.map(sku => <option key={sku.id} value={sku.id}>{sku.sku} · {sku.name}{sku.colorCode ? ` · ${sku.colorCode}` : ''}</option>)}</select></label><label>销售市场<select value={market} onChange={event => setMarket(event.target.value as 'DE' | 'AT')} disabled={busy}><option value="DE">德国 DE</option><option value="AT">奥地利 AT</option></select></label><label>EUR 含税单价<input value={gross} onChange={event => setGross(event.target.value)} inputMode="decimal" placeholder="例如 2499.00" required disabled={busy} /></label><label>税率（基点）<input value={taxRate} onChange={event => setTaxRate(event.target.value)} inputMode="numeric" placeholder="例如 1900 = 19%" required disabled={busy} /></label><button className="av-btn" data-variant="primary" type="submit" disabled={busy || !skuId || !gross.trim() || !taxRate.trim()}>保存草稿</button></form></section>
    <section className="av-card" aria-label="价格版本列表"><div className="av-cardhead"><div><h2 className="av-cardtitle">价格版本</h2><p className="av-cardhint">共 {visiblePrices.length} 条真实价格记录；退役价格不会改写历史订单快照。</p></div></div><div className="av-tablewrap"><table className="av-table av-ecommerce-price-table"><thead><tr><th>SKU</th><th>市场</th><th>含税售价</th><th>税率</th><th>状态</th><th>版本</th><th>生效时间</th><th>操作</th></tr></thead><tbody>{visiblePrices.map(price => <tr key={price.id}><td><strong>{price.sku}</strong><span className="av-table-subtext">{price.skuName}</span></td><td>{price.marketCountry}</td><td>{price.unitPriceGross} {price.currency}</td><td>{price.taxRateBasisPoints / 100}%</td><td><span className="av-tag" data-tone={price.status === 'ACTIVE' ? 'good' : price.status === 'DRAFT' ? 'warn' : undefined}>{price.status === 'ACTIVE' ? '已启用' : price.status === 'DRAFT' ? '草稿' : '已退役'}</span></td><td>V{price.version}</td><td>{price.effectiveFrom ? new Date(price.effectiveFrom).toLocaleString('zh-CN') : '—'}</td><td>{price.status === 'DRAFT' ? <button className="av-btn" type="button" disabled={busy} onClick={() => void run(() => commerceApi<Price>(`prices/${price.id}/activate`, { expectedVersion: price.version }), '价格版本已启用。')}>启用</button> : price.status === 'ACTIVE' ? <button className="av-btn" type="button" disabled={busy} onClick={() => void run(() => commerceApi<Price>(`prices/${price.id}/retire`, { expectedVersion: price.version }), '价格版本已退役。')}>退役</button> : '—'}</td></tr>)}</tbody></table></div>{!visiblePrices.length ? <p className="av-empty-state">尚未配置价格。请在上方选择已有 SKU 并保存价格草稿。</p> : null}</section>
  </div>;
}

