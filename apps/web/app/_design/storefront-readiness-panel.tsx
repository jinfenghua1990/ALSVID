'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Market = 'DE' | 'AT';
type Blocker =
  | 'MODEL_NOT_PUBLISHED' | 'MODEL_NOT_ACTIVE' | 'VARIANT_NOT_ACTIVE'
  | 'SKU_NOT_ACTIVE' | 'MARKET_SCOPE_UNVERIFIED' | 'NO_ACTIVE_PRICE'
  | 'NO_MARKET_STOCK_POSITION' | 'NO_LEDGER_AVAILABILITY'
  | 'CHANNEL_ALLOCATION_UNVERIFIED' | 'TAX_SHIPPING_UNVERIFIED'
  | 'PSP_NOT_CONFIGURED';
type Row = {
  skuId: string; sku: string; skuName: string; modelCode: string; variantCode: string;
  colorCode: string | null; marketCode: string | null; publicationStatus: string;
  priceGross: string | null; currency: 'EUR'; locationCount: number;
  onHand: string | null; reserved: string | null; ledgerAvailable: string | null;
  checkoutEnabled: false; inventoryReservable: false; blockers: Blocker[];
};
type Snapshot = { market: Market; checkedAt: string; checkoutEnabled: false; truncated: boolean; query: string; rows: Row[] };

const descriptions: Record<Blocker, string> = {
  MODEL_NOT_PUBLISHED: '型号尚未通过官网发布审核',
  MODEL_NOT_ACTIVE: '型号未启用',
  VARIANT_NOT_ACTIVE: '规格未启用',
  SKU_NOT_ACTIVE: 'SKU 未启用',
  MARKET_SCOPE_UNVERIFIED: 'SKU 目标销售市场未核实',
  NO_ACTIVE_PRICE: '缺少该市场的有效 EUR 价格',
  NO_MARKET_STOCK_POSITION: '该市场仓库无可核对的 SKU 库存记录',
  NO_LEDGER_AVAILABILITY: '该市场台账可用数量不足',
  CHANNEL_ALLOCATION_UNVERIFIED: '尚无官网渠道库存分配与仓库履约授权',
  TAX_SHIPPING_UNVERIFIED: '结账税费、运费与消费者条款尚未验收',
  PSP_NOT_CONFIGURED: '未启用经核验的支付服务',
};
function amount(value: string | null): string {
  return value === null ? '未知' : value;
}

/** Diagnostic only; never offers order/payment/stock mutation actions. */
export function StorefrontReadinessPanel() {
  const [market, setMarket] = useState<Market>('DE');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [issue, setIssue] = useState<'ALL' | 'PUBLICATION' | 'PRICE' | 'STOCK'>('ALL');
  const load = useCallback(async (signal?: AbortSignal) => {
    setState('loading'); setError(''); setSnapshot(null);
    try {
      const params = new URLSearchParams({marketCountry: market});
      if (appliedQuery) params.set('query', appliedQuery);
      const response = await fetch('/api/control/v1/commerce/storefront/readiness?' + params,
        { cache: 'no-store', ...(signal ? { signal } : {}) });
      const payload: unknown = await response.json().catch(() => null);
      const wrapper = payload && typeof payload === 'object' ? payload as { data?: unknown; message?: string } : null;
      if (!response.ok) throw new Error(
        response.status === 401 ? '登录已过期' :
        response.status === 403 ? '当前账号缺少订单或库存读取权限' :
        wrapper?.message || '联动检查接口不可用');
      const data = wrapper?.data;
      if (!data || typeof data !== 'object') throw new Error('联动检查返回格式异常');
      const next = data as Partial<Snapshot>;
      if (next.market !== market || next.query !== appliedQuery ||
          next.checkoutEnabled !== false || !Array.isArray(next.rows) ||
          next.rows.some(row => !row || typeof row.sku !== 'string' ||
            !Array.isArray(row.blockers) || row.checkoutEnabled !== false))
        throw new Error('联动检查返回内容不可信');
      if (signal?.aborted) return;
      setSnapshot(next as Snapshot); setState('ready');
    } catch (reason) {
      if (signal?.aborted) return;
      setSnapshot(null);
      setError(reason instanceof Error ? reason.message : '联动检查失败');
      setState('error');
    }
  }, [market, appliedQuery]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const issueCodes: Record<Exclude<typeof issue, 'ALL'>, readonly Blocker[]> = {
    PUBLICATION: ['MODEL_NOT_PUBLISHED', 'MODEL_NOT_ACTIVE', 'VARIANT_NOT_ACTIVE', 'SKU_NOT_ACTIVE'],
    PRICE: ['NO_ACTIVE_PRICE', 'MARKET_SCOPE_UNVERIFIED'],
    STOCK: ['NO_MARKET_STOCK_POSITION', 'NO_LEDGER_AVAILABILITY'],
  };
  const allRows = snapshot?.rows ?? [];
  const rows = issue === 'ALL' ? allRows : allRows.filter(row =>
    issueCodes[issue].some(code => row.blockers.includes(code)));
  const counts = {
    publication: allRows.filter(row => issueCodes.PUBLICATION.some(b => row.blockers.includes(b))).length,
    price: allRows.filter(row => issueCodes.PRICE.some(b => row.blockers.includes(b))).length,
    stock: allRows.filter(row => issueCodes.STOCK.some(b => row.blockers.includes(b))).length,
  };
  function searchSku(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length > 100) {
      setError('查询词不能超过 100 个字符。');
      return;
    }
    setIssue('ALL');
    setAppliedQuery(normalized);
    if (normalized === appliedQuery) void load();
  }
  return <section className="av-card" aria-label="官网商品、价格与库存联动检查">
    <div className="av-cardhead">
      <div>
        <p className="av-eyebrow">STOREFRONT READINESS · READ ONLY</p>
        <h2 className="av-cardtitle">官网商品 / 售价 / 库存联动检查</h2>
        <p className="av-cardhint">同一 SKU 关联 Product 审核、Commerce 市场售价及 Inventory 台账。以下为服务端实时诊断，不是官网可售承诺；不会扣减或预留库存。</p>
      </div>
      <div>
        <label htmlFor="commerce-readiness-market">目标市场</label>{' '}
        <select id="commerce-readiness-market" value={market} onChange={event => setMarket(event.target.value as Market)}>
          <option value="DE">德国 DE</option><option value="AT">奥地利 AT</option>
        </select>{' '}
        <button type="button" className="av-btn" disabled={state === 'loading'} onClick={() => void load()}>重新核对</button>
      </div>
    </div>
    <p className="av-cardhint">正式结账仍关闭：渠道 ATP 分配、税费/运费、付款核验尚未完成。仓库台账可用量不代表消费者可购买数量；查询异常时绝不显示“0 库存”或开放下单。</p>
    {state === 'loading' ? <p role="status">正在同时核对已发布商品、市场价格和库存台账…</p> : null}
    {state === 'error' ? <p role="alert">联动检查失败：{error}。请检查 API，不能据此判断缺货或可以购买。</p> : null}
    {state === 'ready' && snapshot ? <>
      <p className="av-cardhint">核对时间：{new Date(snapshot.checkedAt).toLocaleString('zh-CN')}；
        本次数据库查询返回 {snapshot.rows.length} 条 SKU；官网结账状态：<strong>未开放</strong>。
        {snapshot.truncated ? '结果达到 500 条上限：请在下方提交 SKU/型号关键词，服务器会在全量数据中先搜索后截取。' : ''}
      </p>
      <form className="av-commerce-stock-filter" onSubmit={searchSku} role="search" aria-label="全量 SKU 搜索">
        <label htmlFor="commerce-readiness-search">从数据库查询型号 / SKU（不是仅筛选前 500 条）</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <input id="commerce-readiness-search" type="search" value={query}
            maxLength={100} onChange={event => setQuery(event.target.value)}
            placeholder="例如 FC1、BLACK、SKU 编码" />
          <button type="submit" className="av-btn">查询 SKU</button>
          {appliedQuery ? <button type="button" className="av-btn" onClick={()=>{
            setQuery(''); setAppliedQuery(''); setIssue('ALL');
          }}>清除查询</button> : null}
        </div>
      </form>
      <div role="group" aria-label="未达成条件筛选" style={{display:'flex',gap:8,flexWrap:'wrap',margin:'12px 0'}}>
        {([
          ['ALL','全部结果',allRows.length],
          ['PUBLICATION','发布及状态问题',counts.publication],
          ['PRICE','市场/售价问题',counts.price],
          ['STOCK','库存问题',counts.stock],
        ] as const).map(([key,label,count])=><button
          key={key} type="button" className="av-btn" aria-pressed={issue===key}
          onClick={()=>setIssue(key)}>{label} · {count}</button>)}
      </div>
      {error && state === 'ready' ? <p role="alert">{error}</p> : null}
      {rows.length ? <div className="av-commerce-stock-scroll" role="region" tabIndex={0} aria-label="官网可售条件核对表">
        <table className="av-commerce-stock-table">
          <thead><tr><th>SKU / 型号</th><th>发布审核</th><th>市场售价（参考）</th><th>对应市场台账</th><th>未达成条件</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.skuId}>
            <td><strong>{row.sku}</strong><span>{row.modelCode} / {row.variantCode} · {row.skuName}</span></td>
            <td>{row.publicationStatus === 'PUBLISHED' ? '已发布' : '未发布 / 未审批'}</td>
            <td>{row.priceGross === null ? '未配置' : row.priceGross + ' EUR'}<span>非正式结账报价</span></td>
            <td>{row.locationCount === 0 ? '未核实库存位置' : amount(row.ledgerAvailable) + ' 台账可用'}
              <span>现存 {amount(row.onHand)} / 已预留 {amount(row.reserved)}</span></td>
            <td><strong>不可下单</strong><span>{row.blockers.map(b => descriptions[b] ?? b).join('；')}</span></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="av-cardhint">{issue !== 'ALL' ? '当前查询没有该类问题。' :
          appliedQuery ? '数据库中没有匹配该关键词的 SKU。' :
          '目前没有可查询 SKU。请先到商品档案建立 SKU。'}</p>}
    </> : null}
  </section>;
}
