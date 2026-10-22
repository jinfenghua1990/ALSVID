'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type StockPosition = {
  item_kind: 'PART' | 'SKU' | 'VEHICLE';
  sku_id: string | null;
  sku: string | null;
  sku_name: string | null;
  warehouse_code: string;
  warehouse_name: string;
  location_code: string;
  location_name: string;
  on_hand: string;
  reserved: string;
  available: string;
  unit: string;
};
type StockSummary = { balances: StockPosition[] };

function displayAmount(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('zh-CN', { maximumFractionDigits: 6 }) : value;
}

/**
 * Read-only Commerce projection of the authorized Inventory ledger.
 * A positive ledger balance is NOT a promise that this item can be sold on
 * WWW. Channel allocation, listing approval, market restrictions, warehouse
 * fulfillment eligibility and vehicle-level stock are separate decisions.
 */
export function EcommerceInventoryPanel() {
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [query, setQuery] = useState('');

  const reload = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    setError('');
    try {
      const response = await fetch('/api/control/v1/inventory', { cache: 'no-store', signal });
      const payload = await response.json().catch(() => null) as { data?: StockSummary; message?: string } | null;
      if (!response.ok) throw new Error(response.status === 401 ? '登录已过期，请重新登录' : response.status === 403 ? '当前账户无权查看库存台账' : payload?.message ?? '读取库存失败');
      if (!Array.isArray(payload?.data?.balances)) throw new Error('库存接口返回的数据格式异常');
      if (signal?.aborted) return;
      setPositions(payload.data.balances.filter(row => row.item_kind === 'SKU'));
      setFetchedAt(new Date().toLocaleString('zh-CN'));
      setState('ready');
    } catch (reason) {
      if (signal?.aborted) return;
      setPositions([]);
      setFetchedAt('');
      setError(reason instanceof Error ? reason.message : '库存读取失败');
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return positions.filter(row => !term || [row.sku, row.sku_name, row.warehouse_name, row.warehouse_code, row.location_code]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(term)));
  }, [positions, query]);

  return <section id="inventory" className="av-card" aria-label="电商库存">
    <div className="av-cardhead">
      <div>
        <p className="av-eyebrow">ECOMMERCE STOCK / READ ONLY</p>
        <h2 className="av-cardtitle">电商库存 · SKU 库存查询</h2>
        <p className="av-cardhint">读取仓储物流的库存流水汇总，查看 SKU 的仓库现存量、预留量和台账可用量。不创建第二套库存，也不能在这里直接修改库存。</p>
      </div>
      <div>
        <button type="button" className="av-btn" onClick={() => void reload()} disabled={state === 'loading'}>刷新库存</button>{' '}
        <a className="av-btn" href="/admin/inventory">前往仓储物流</a>
      </div>
    </div>
    <p className="av-cardhint"><strong>重要：</strong>台账可用量不等于商城可售量。尚需结合官网商品发布状态、DE/AT 市场限制、仓库可履约范围、渠道预留和整车 VIN 实物进行可售性判定；未配置规则时不能自动开放售卖。</p>
    {state === 'loading' ? <p role="status">正在查询真实库存台账…</p> : null}
    {state === 'error' ? <p role="alert">库存读取失败：{error}。库存未知，不代表缺货或零库存。</p> : null}
    {state === 'ready' ? <>
      <p className="av-cardhint">库存查询时间：{fetchedAt}（不是第三方仓最后同步时间）。本次读到 {positions.length} 个 SKU 库位记录；整车 VIN 由仓储物流单独管理，不与 SKU 数量重复相加。</p>
      <label className="av-commerce-stock-filter">
        <span>筛选 SKU / 仓库 / 库位</span>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="例如 FC1、DE、BLACK" type="search" />
      </label>
      {filtered.length ? <div className="av-commerce-stock-scroll" role="region" aria-label="SKU 库存台账明细" tabIndex={0}>
        <table className="av-commerce-stock-table">
          <thead><tr><th>SKU</th><th>仓库 / 库位</th><th>现存</th><th>已预留</th><th>台账可用</th><th>商城可售判定</th></tr></thead>
          <tbody>{filtered.slice(0, 100).map((row, index) => <tr key={[row.sku_id, row.warehouse_code, row.location_code, row.unit, index].join(':')}>
            <td><strong>{row.sku ?? '未映射 SKU'}</strong><span>{row.sku_name ?? '—'}</span></td>
            <td>{row.warehouse_name || row.warehouse_code}<span>{row.location_name || row.location_code}</span></td>
            <td>{displayAmount(row.on_hand)} {row.unit}</td>
            <td>{displayAmount(row.reserved)} {row.unit}</td>
            <td>{displayAmount(row.available)} {row.unit}</td>
            <td>待接入市场 / 渠道规则</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="av-cardhint">{query ? '没有匹配该筛选条件的 SKU 库存位置。' : '当前库存台账没有 SKU 类型的库位记录；整车可能按 VIN 单独管理，请到仓储物流查看。'}</p>}
      {filtered.length > 100 ? <p className="av-cardhint">只展示前 100 条匹配结果，请缩小筛选条件或到仓储物流查看完整台账。</p> : null}
    </> : null}
  </section>;
}
