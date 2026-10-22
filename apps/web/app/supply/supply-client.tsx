'use client';

import { OperationsFrame } from '../_components/operations-frame';


import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './supply.module.css';

type ItemType = 'PART' | 'SKU';
type Partner = { id: string; partnerCode: string; displayName: string; roles: string[]; kind?: 'ORGANIZATION' | 'PERSON'; legalName?: string | null; status?: string | null; countryCode?: string | null };
type Part = { id: string; part_number: string; name: string };
type Sku = { id: string; sku: string; name: string };
type Quotation = { id: string; quotation_number: string; supplier_name: string; supplier_partner_id: string; supplier_reference: string | null; currency: string; status: string; valid_until: string | null; created_at: string };
type QuoteLine = { id: string; quotation_id: string; line_no: number; item_type: ItemType; part_number: string | null; sku: string | null; quantity: string; unit: string; unit_price: string };
type PurchaseOrder = { id: string; po_number: string; supplier_name: string; supplier_partner_id: string; currency: string; status: string; total_amount: string; issued_at: string | null; confirmed_at: string | null; created_at: string };
type PoLine = { id: string; purchase_order_id: string; line_no: number; item_type: ItemType; part_number: string | null; sku: string | null; ordered_quantity: string; unit: string; unit_price: string; requested_date: string | null };
type Receipt = { id: string; purchase_order_id: string; kind: string; reference: string | null; occurred_on: string; created_at: string };
type Snapshot = { id: string; purchase_order_id: string; state: string; po_version: number; created_at: string };
type Procurement = { quotations: Quotation[]; quoteLines: QuoteLine[]; purchaseOrders: PurchaseOrder[]; purchaseOrderLines: PoLine[]; confirmations: unknown[]; confirmationLines: unknown[]; receipts: Receipt[]; receiptLines: unknown[]; snapshots: Snapshot[] };

const empty: Procurement = { quotations: [], quoteLines: [], purchaseOrders: [], purchaseOrderLines: [], confirmations: [], confirmationLines: [], receipts: [], receiptLines: [], snapshots: [] };
const statusLabels: Record<string,string> = {
  DRAFT:'草稿', ISSUED:'已发出', CONFIRMED:'供应商已确认', PARTIALLY_FULFILLED:'部分履约', FULFILLED:'已完成',
  ACCEPTED:'已接受', REJECTED:'已拒绝', PHYSICAL_RECEIPT:'实物收货', FACTORY_COMMITMENT:'工厂承诺',
};
const statusLabel=(status:string)=>statusLabels[status]??status.replaceAll('_',' ');
const statusTone = (status: string): 'neutral' | 'good' | 'warn' | 'bad' => {
  if (['ACCEPTED', 'CONFIRMED', 'FULFILLED', 'ACTIVE'].includes(status)) return 'good';
  if (['REJECTED', 'INACTIVE'].includes(status)) return 'bad';
  if (['ISSUED', 'PARTIALLY_FULFILLED', 'FACTORY_COMMITMENT'].includes(status)) return 'warn';
  return 'neutral';
};
const OPEN_ORDER_STATUSES: string[] = ['ISSUED', 'CONFIRMED', 'PARTIALLY_FULFILLED'];

export default function SupplyClient({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<Procurement>(empty);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<{ procurement?: string; partners?: string; engineering?: string; catalog?: string }>({});
  const [selectedPo, setSelectedPo] = useState('');
  const [quoteItemType, setQuoteItemType] = useState<ItemType>('PART');
  const [poRows, setPoRows] = useState<Array<{ id: number; itemType: ItemType }>>([{ id: 0, itemType: 'PART' }]);
  const nextPoId = useRef(1);
  const [activeView, setActiveView] = useState<'suppliers' | 'quotations' | 'orders' | 'receipts'>('suppliers');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('all');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);
  const posting = useRef(false);
  const [busy, setBusy] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('登录状态已失效');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function reload() {
    setLoading(true);
    setLoadErrors({});
    const keys = ['procurement', 'partners', 'engineering', 'catalog'] as const;
    const paths = ['/v1/procurement', '/v1/partners', '/v1/engineering', '/v1/product/catalog'];
    const results = await Promise.allSettled(paths.map(path => api(path)));
    const failures: Partial<Record<typeof keys[number], string>> = {};
    for (const [index, result] of results.entries()) {
      const key = keys[index]!;
      if (result.status === 'rejected') {
        failures[key] = result.reason instanceof Error ? result.reason.message : '数据请求失败';
        if (key === 'procurement') setData(empty);
        if (key === 'partners') setPartners([]);
        if (key === 'engineering') setParts([]);
        if (key === 'catalog') setSkus([]);
        continue;
      }
      const value = result.value;
      if (key === 'procurement') {
        if (Array.isArray(value?.purchaseOrders) && Array.isArray(value?.quotations) && Array.isArray(value?.receipts)) setData(value);
        else { setData(empty); failures[key] = '采购 API 返回格式异常'; }
      } else if (key === 'partners') {
        if (Array.isArray(value)) setPartners(value.filter((partner: Partner) => partner.roles.includes('SUPPLIER') || partner.roles.includes('FACTORY')));
        else { setPartners([]); failures[key] = '供应商 API 返回格式异常'; }
      } else if (key === 'engineering') {
        if (Array.isArray(value?.parts)) setParts(value.parts);
        else { setParts([]); failures[key] = '工程物料 API 返回格式异常'; }
      } else if (key === 'catalog') {
        if (Array.isArray(value?.skus)) setSkus(value.skus);
        else { setSkus([]); failures[key] = '产品目录 API 返回格式异常'; }
      }
    }
    setLoadErrors(failures);
    setLoading(false);
  }

  useEffect(() => { void reload(); }, []);

  const metrics = useMemo(() => [
    { label: '供应商组织', value: loading || loadErrors.partners ? '—' : partners.length.toLocaleString('zh-CN'), hint: '已关联供应商 / 工厂' },
    { label: '草稿报价', value: loading || loadErrors.procurement ? '—' : data.quotations.filter((item) => item.status === 'DRAFT').length.toLocaleString('zh-CN'), hint: '待处理报价记录' },
    { label: '待供应商确认', value: loading || loadErrors.procurement ? '—' : data.purchaseOrders.filter((item) => item.status === 'ISSUED').length.toLocaleString('zh-CN'), hint: '采购单已发出' },
    { label: '履约中采购单', value: loading || loadErrors.procurement ? '—' : data.purchaseOrders.filter((item) => ['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(item.status)).length.toLocaleString('zh-CN'), hint: '确认或部分履约' },
  ], [partners, data, loading, loadErrors]);

  const selected = data.purchaseOrders.find((po) => po.id === selectedPo) ?? null;
  const selectedLines = selected ? data.purchaseOrderLines.filter((line) => line.purchase_order_id === selected.id) : [];
  const selectedPartnerRecord = partners.find((partner) => partner.id === selectedPartner) ?? null;
  const partnerStats = useMemo(() => partners.map((partner) => {
    const quotations = data.quotations.filter((item) => item.supplier_partner_id === partner.id);
    const orders = data.purchaseOrders.filter((item) => item.supplier_partner_id === partner.id);
    return {
      partner,
      quotations,
      orders,
      openOrders: orders.filter((item) => OPEN_ORDER_STATUSES.includes(item.status)).length,
    };
  }), [partners, data]);
  const query = supplierQuery.trim().toLocaleLowerCase();
  const visiblePartners = partnerStats.filter(({ partner }) => {
    const text = [partner.displayName, partner.legalName ?? '', partner.partnerCode, partner.countryCode ?? '', ...partner.roles].join(' ').toLocaleLowerCase();
    return (selectedPartner === 'all' || partner.id === selectedPartner) && (!query || text.includes(query));
  });
  const visibleQuotations = data.quotations.filter((item) => {
    const matchesPartner = selectedPartner === 'all' || item.supplier_partner_id === selectedPartner;
    const text = [item.quotation_number, item.supplier_name, item.supplier_reference ?? ''].join(' ').toLocaleLowerCase();
    return matchesPartner && (!query || text.includes(query));
  });
  const visibleOrders = data.purchaseOrders.filter((item) => {
    const matchesPartner = selectedPartner === 'all' || item.supplier_partner_id === selectedPartner;
    const text = [item.po_number, item.supplier_name].join(' ').toLocaleLowerCase();
    return matchesPartner && (!query || text.includes(query));
  });
  const visibleReceipts = data.receipts.filter((receipt) => {
    const po = data.purchaseOrders.find((item) => item.id === receipt.purchase_order_id);
    const matchesPartner = selectedPartner === 'all' || po?.supplier_partner_id === selectedPartner;
    const text = [receipt.reference ?? '', po?.po_number ?? '', po?.supplier_name ?? '', receipt.kind].join(' ').toLocaleLowerCase();
    return matchesPartner && (!query || text.includes(query));
  });

  async function post(event: FormEvent<HTMLFormElement>, endpoint: string, build: (form: FormData) => unknown) {
    event.preventDefault();
    if (posting.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let payload: unknown;
    try { payload = build(form); }
    catch (error) { setMessage(error instanceof Error ? error.message : '请检查输入内容'); return; }
    posting.current = true;
    setBusy(true);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setMessage('已保存。');
      formElement.reset();
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作结果不确定，请先刷新核对后再试，避免重复单据');
    } finally {
      posting.current = false;
      setBusy(false);
    }
  }

  async function action(endpoint: string, body: unknown = {}) {
    if (posting.current) return;
    posting.current = true;
    setBusy(true);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setMessage('已更新。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作结果不确定，请刷新核对后再试');
    } finally {
      posting.current = false;
      setBusy(false);
    }
  }

  function itemLine(form: FormData) {
    return {
      itemType: String(form.get('itemType')) as ItemType,
      itemId: String(form.get('itemId')),
      quantity: String(form.get('quantity')),
      unitPrice: String(form.get('unitPrice')),
      unit: String(form.get('unit') || 'EA'),
      supplierItemReference: String(form.get('supplierItemReference') || '') || undefined,
      requestedDate: String(form.get('requestedDate') || '') || undefined,
    };
  }

  function purchaseLine(form: FormData, id: number) {
    const itemType = String(form.get('poType-' + id)) as ItemType;
    const itemId = String(form.get('poItem-' + id) ?? '');
    const quantity = String(form.get('poQuantity-' + id) ?? '');
    const unitPrice = String(form.get('poPrice-' + id) ?? '');
    if (!['PART','SKU'].includes(itemType) || !itemId ||
      !Number.isFinite(Number(quantity)) || Number(quantity) <= 0 ||
      !unitPrice || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0) {
      throw new Error('请为每一条采购明细选择物料并填写有效数量和单价');
    }
    return { itemType, itemId, quantity, unitPrice,
      unit: String(form.get('poUnit-' + id) || 'EA'),
      requestedDate: String(form.get('poDate-' + id) || '') || undefined };
  }

  function itemOptions(type: ItemType) {
    return type === 'SKU'
      ? skus.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)
      : parts.map((item) => <option key={item.id} value={item.id}>{item.part_number} · {item.name}</option>);
  }

  return (
    <OperationsFrame embedded={embedded} area="supply" footer="ALSVID · 内部管理">
      <section className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <div className={styles.eyebrow}>SUPPLY CHAIN / PARTNERS</div>
            <h1>供应商管理</h1>
            <p>统一管理供货组织、供应商报价与采购履约。所有记录来自当前采购业务接口；未接入的档案指标不会用示例数据填充。</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.buttonSecondary} type="button" onClick={() => { setShowQuoteForm((open) => !open); setShowPoForm(false); setActiveView('quotations'); }}>{showQuoteForm ? '收起报价表单' : '+ 新建报价'}</button>
            <button className={styles.buttonPrimary} type="button" onClick={() => { setShowPoForm((open) => !open); setShowQuoteForm(false); setActiveView('orders'); }}>{showPoForm ? '收起采购表单' : '+ 新建采购单'}</button>
          </div>
        </header>

        {message ? <div className={styles.notice} role="status">{message}</div> : null}
        {Object.keys(loadErrors).length > 0 ? <div className={styles.notice} role="alert">部分模块读取失败：{Object.entries(loadErrors).map(([key, reason]) => `${key}: ${reason}`).join('；')}。其他模块仍可查看；请检查权限、网络后重新加载。<button type="button" className={styles.textAction} onClick={() => void reload()}>重新加载</button></div> : null}

        <div className={styles.metrics}>
          {metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.label}>
              <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.hint}</small>
            </article>
          ))}
        </div>

        <div className={styles.workspaceBar}>
          <nav className={styles.tabs} aria-label="供应商工作区">
            <button type="button" className={styles.tabButton} aria-pressed={activeView === 'suppliers'} onClick={() => setActiveView('suppliers')}>供应商目录</button>
            <button type="button" className={styles.tabButton} aria-pressed={activeView === 'quotations'} onClick={() => setActiveView('quotations')}>报价管理 <span>{data.quotations.length}</span></button>
            <button type="button" className={styles.tabButton} aria-pressed={activeView === 'orders'} onClick={() => setActiveView('orders')}>采购订单 <span>{data.purchaseOrders.length}</span></button>
            <button type="button" className={styles.tabButton} aria-pressed={activeView === 'receipts'} onClick={() => setActiveView('receipts')}>履约记录 <span>{data.receipts.length}</span></button>
          </nav>
          <div className={styles.filters}>
            <label className={styles.searchField}><span aria-hidden="true">⌕</span><input type="search" value={supplierQuery} onChange={(event) => setSupplierQuery(event.target.value)} placeholder="搜索供应商、报价单或采购单" aria-label="搜索供应商、报价单或采购单" /></label>
            <select className={styles.filterSelect} value={selectedPartner} onChange={(event) => setSelectedPartner(event.target.value)} aria-label="按供应商筛选">
              <option value="all">全部供应商</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.displayName}</option>)}
            </select>
          </div>
        </div>

        {showQuoteForm ? (
          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.sectionEyebrow}>NEW QUOTATION</span><h2>记录供应商报价</h2><p>保存报价依据；接受报价不会自动批准或发出采购订单。</p></div>
              <button className={styles.closeButton} type="button" onClick={() => setShowQuoteForm(false)}>收起 ×</button>
            </div>
            <form className={styles.formGrid} onSubmit={(event) => void post(event, '/v1/procurement/quotations', (form) => ({ supplierPartnerId: form.get('supplierPartnerId'), supplierReference: form.get('supplierReference') || undefined, currency: form.get('currency'), validUntil: form.get('validUntil') || undefined, incoterm: form.get('incoterm') || undefined, paymentTerms: form.get('paymentTerms') || undefined, lines: [itemLine(form)] }))}>
              <label><span>供应商 / 工厂</span><select name="supplierPartnerId" required defaultValue=""><option value="" disabled>选择供应商 / 工厂</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partnerCode} · {partner.displayName}</option>)}</select></label>
              <label><span>币种</span><input name="currency" defaultValue="EUR" maxLength={3} required /></label>
              <label><span>贸易条款</span><input name="incoterm" placeholder="FCA / FOB" /></label>
              <label><span>供应商报价单号</span><input name="supplierReference" placeholder="输入供应商提供的编号" /></label>
              <label><span>付款条件</span><input name="paymentTerms" placeholder="例如：交货后 30 天" /></label>
              <label><span>报价有效期</span><input name="validUntil" type="date" /></label>
              <div className={styles.formPair}>
                <label><span>物料类型</span><select name="itemType" value={quoteItemType} onChange={(event) => setQuoteItemType(event.target.value as ItemType)}><option value="PART">零件</option><option value="SKU">整车 SKU</option></select></label>
                <label><span>物料</span><select key={quoteItemType} name="itemId" required defaultValue=""><option value="" disabled>选择物料</option>{itemOptions(quoteItemType)}</select></label>
              </div>
              <div className={styles.formPair}>
                <label><span>数量</span><input name="quantity" inputMode="decimal" placeholder="输入数量" required /></label>
                <label><span>单位</span><input name="unit" defaultValue="EA" /></label>
                <label><span>单价</span><input name="unitPrice" inputMode="decimal" placeholder="输入单价" required /></label>
              </div>
              <div className={styles.formFooter}><span>报价保存后会显示在报价管理中。</span><button className={styles.buttonPrimary} type="submit" disabled={busy}>{busy ? '提交中…' : '保存报价'}</button></div>
            </form>
          </section>
        ) : null}

        {showPoForm ? (
          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.sectionEyebrow}>NEW PURCHASE ORDER</span><h2>创建采购单草稿</h2><p>草稿保存后仍需按授权流程发出；不会直接改变库存或执行付款。</p></div>
              <button className={styles.closeButton} type="button" onClick={() => setShowPoForm(false)}>收起 ×</button>
            </div>
            <form className={styles.formGrid} onSubmit={(event) => void post(event, '/v1/procurement/purchase-orders', (form) => ({ supplierPartnerId: form.get('supplierPartnerId'), sourceQuotationId: form.get('sourceQuotationId') || undefined, currency: form.get('currency'), incoterm: form.get('incoterm') || undefined, paymentTerms: form.get('paymentTerms') || undefined, depositTerms: form.get('depositTerms') || undefined, lines: poRows.map(row => purchaseLine(form, row.id)) }))}>
              <label><span>供应商 / 工厂</span><select name="supplierPartnerId" required defaultValue=""><option value="" disabled>选择供应商 / 工厂</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partnerCode} · {partner.displayName}</option>)}</select></label>
              <label><span>关联已接受报价</span><select name="sourceQuotationId" defaultValue=""><option value="">不关联源报价</option>{data.quotations.filter((quotation) => quotation.status === 'ACCEPTED').map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.quotation_number} · {quotation.supplier_name}</option>)}</select></label>
              <label><span>币种</span><input name="currency" defaultValue="EUR" maxLength={3} required /></label>
              <label><span>贸易条款</span><input name="incoterm" placeholder="FCA / FOB" /></label>
              <label><span>付款条件</span><input name="paymentTerms" placeholder="付款约定" /></label>
              <label><span>定金条件</span><input name="depositTerms" placeholder="定金约定" /></label>
              <div className={styles.poLines}>
                <div className={styles.lineHeading}><strong>采购物料明细 · {poRows.length} 行</strong><button type="button" className={styles.textAction} disabled={busy} onClick={() => setPoRows(rows => [...rows, { id: nextPoId.current++, itemType: 'PART' }])}>＋ 添加物料</button></div>
                {poRows.map((row, index) => <div className={styles.poLine} key={row.id}>
                  <div className={styles.lineHeading}><strong>物料行 {index + 1}</strong>{poRows.length > 1 ? <button type="button" className={styles.textActionDanger} disabled={busy} onClick={() => setPoRows(rows => rows.filter(item => item.id !== row.id))}>移除</button> : null}</div>
                  <div className={styles.formPair}>
                    <label><span>物料类型</span><select name={'poType-' + row.id} value={row.itemType} onChange={(event) => setPoRows(rows => rows.map(item => item.id === row.id ? { ...item, itemType: event.target.value as ItemType } : item))}><option value="PART">零件</option><option value="SKU">整车 SKU</option></select></label>
                    <label><span>物料</span><select key={row.itemType} name={'poItem-' + row.id} required defaultValue=""><option value="" disabled>选择物料</option>{itemOptions(row.itemType)}</select></label>
                  </div>
                  <div className={styles.formPair}>
                    <label><span>数量</span><input name={'poQuantity-' + row.id} type="number" min="0.000001" step="any" placeholder="输入数量" required /></label>
                    <label><span>单位</span><input name={'poUnit-' + row.id} defaultValue="EA" /></label>
                    <label><span>单价</span><input name={'poPrice-' + row.id} type="number" min="0" step="any" placeholder="输入单价" required /></label>
                  </div>
                  <label><span>要求交付日期</span><input name={'poDate-' + row.id} type="date" /></label>
                </div>)}
              </div>
              <div className={styles.formFooter}><span>创建后可在采购订单中查看并发出。</span><button className={styles.buttonPrimary} type="submit" disabled={busy}>{busy ? '提交中…' : '创建采购单草稿'}</button></div>
            </form>
          </section>
        ) : null}

        {activeView === 'suppliers' ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.sectionEyebrow}>SUPPLIER DIRECTORY</span><h2>供应商目录</h2><p>以已关联的供应商 / 工厂组织为基础，查看其报价与采购履约记录。</p></div>
              <div className={styles.panelMeta}>
                {selectedPartnerRecord ? <button className={styles.clearFilter} type="button" onClick={() => setSelectedPartner('all')}>清除筛选 ×</button> : <span className={styles.count}>{visiblePartners.length} 个组织</span>}
              </div>
            </div>
            {loading ? <div className={styles.emptyState}><strong>正在加载供应商档案</strong><p>正在读取已关联的供应商 / 工厂组织。</p></div> : loadErrors.partners ? <div className={styles.emptyState}><strong>供应商数据加载失败</strong><p>{loadErrors.partners}</p><button className={styles.textAction} type="button" onClick={() => void reload()}>重新加载</button></div> : visiblePartners.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>供应商 / 工厂</th><th>国家 / 地区</th><th>组织类型</th><th>业务角色</th><th>报价</th><th>采购单</th><th>待履约</th><th>合作状态</th><th>快捷操作</th></tr></thead>
                  <tbody>{visiblePartners.map(({ partner, quotations, orders, openOrders }) => (
                    <tr key={partner.id} data-selected={selectedPartner === partner.id}>
                      <td><button className={styles.supplierLink} type="button" onClick={() => setSelectedPartner(partner.id)}>{partner.displayName}</button>{partner.legalName && partner.legalName !== partner.displayName ? <small className={styles.subText}>{partner.legalName}</small> : null}<small className={styles.subText}>{partner.partnerCode || '暂无编码'}</small></td>
                      <td>{partner.countryCode || '—'}</td>
                      <td>{partner.kind === 'ORGANIZATION' ? '企业 / 组织' : partner.kind === 'PERSON' ? '个人' : '—'}</td>
                      <td><div className={styles.pillRow}>{partner.roles.filter((role) => role === 'SUPPLIER' || role === 'FACTORY').map((role) => <span className={styles.pill} key={role}>{role === 'FACTORY' ? '工厂' : '供应商'}</span>)}</div></td>
                      <td>{quotations.length}</td><td>{orders.length}</td><td><strong>{openOrders}</strong></td>
                      <td><span className={styles.status} data-tone={statusTone(partner.status ?? '')}>{partner.status === 'ACTIVE' ? '启用' : partner.status === 'INACTIVE' ? '停用' : partner.status || '未知'}</span></td>
                      <td><div className={styles.tableActions}><button className={styles.textAction} type="button" onClick={() => { setSelectedPartner(partner.id); setActiveView('quotations'); }}>报价</button><button className={styles.textAction} type="button" onClick={() => { setSelectedPartner(partner.id); setActiveView('orders'); }}>采购</button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className={styles.emptyState}><strong>{partners.length ? '没有匹配的供应商' : '暂未关联供应商组织'}</strong><p>{partners.length ? '请调整搜索词或清除供应商筛选。' : '请先在合作方管理中关联并启用供应商 / 工厂组织。此处不会显示虚构的供应商档案。'}</p></div>}
          </section>
        ) : null}

        {activeView === 'quotations' ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.sectionEyebrow}>QUOTATIONS</span><h2>报价管理</h2><p>{selectedPartnerRecord ? '当前供应商：' + selectedPartnerRecord.displayName : '查看所有供应商报价及其处理状态。'}</p></div>
              <span className={styles.count}>{visibleQuotations.length} 条报价</span>
            </div>
            {loading ? <div className={styles.emptyState}><strong>正在加载报价记录</strong><p>正在读取采购域数据。</p></div> : loadErrors.procurement ? <div className={styles.emptyState}><strong>报价数据加载失败</strong><p>{loadErrors.procurement}</p><button className={styles.textAction} type="button" onClick={() => void reload()}>重新加载</button></div> : visibleQuotations.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>报价单号</th><th>供应商</th><th>供应商参考号</th><th>币种</th><th>有效期</th><th>状态</th><th>操作</th></tr></thead>
                  <tbody>{visibleQuotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td><strong>{quotation.quotation_number}</strong><small className={styles.subText}>{new Date(quotation.created_at).toLocaleDateString('zh-CN')}</small></td>
                      <td>{quotation.supplier_name}</td><td>{quotation.supplier_reference || '—'}</td><td>{quotation.currency.trim()}</td><td>{quotation.valid_until || '未设置'}</td>
                      <td><span className={styles.status} data-tone={statusTone(quotation.status)}>{statusLabel(quotation.status)}</span></td>
                      <td><div className={styles.tableActions}>{quotation.status === 'DRAFT' ? <><button className={styles.textAction} type="button" onClick={() => void action('/v1/procurement/quotations/' + quotation.id + '/status', { status: 'ACCEPTED' })}>接受</button><button className={styles.textActionDanger} type="button" onClick={() => void action('/v1/procurement/quotations/' + quotation.id + '/status', { status: 'REJECTED' })}>拒绝</button></> : <span className={styles.muted}>无需处理</span>}</div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className={styles.emptyState}><strong>暂无报价记录</strong><p>收到或录入供应商报价后，会显示在这里。</p></div>}
          </section>
        ) : null}

        {activeView === 'orders' ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.sectionEyebrow}>PURCHASE ORDERS</span><h2>采购订单</h2><p>{selectedPartnerRecord ? '当前供应商：' + selectedPartnerRecord.displayName : '查看采购单状态、金额与后续履约记录。'}</p></div>
              <span className={styles.count}>{visibleOrders.length} 张采购单</span>
            </div>
            {loading ? <div className={styles.emptyState}><strong>正在加载采购订单</strong><p>正在读取采购域数据。</p></div> : loadErrors.procurement ? <div className={styles.emptyState}><strong>采购订单加载失败</strong><p>{loadErrors.procurement}</p><button className={styles.textAction} type="button" onClick={() => void reload()}>重新加载</button></div> : visibleOrders.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>采购单号</th><th>供应商</th><th>金额</th><th>创建时间</th><th>发出时间</th><th>状态</th><th>操作</th></tr></thead>
                  <tbody>{visibleOrders.map((po) => (
                    <tr key={po.id} data-selected={selectedPo === po.id}>
                      <td><strong>{po.po_number}</strong><small className={styles.subText}>{data.purchaseOrderLines.filter((line) => line.purchase_order_id === po.id).length} 个物料行</small></td>
                      <td>{po.supplier_name}</td><td>{po.currency.trim()} {po.total_amount}</td><td>{new Date(po.created_at).toLocaleDateString('zh-CN')}</td><td>{po.issued_at ? new Date(po.issued_at).toLocaleDateString('zh-CN') : '—'}</td>
                      <td><span className={styles.status} data-tone={statusTone(po.status)}>{statusLabel(po.status)}</span></td>
                      <td><div className={styles.tableActions}>{po.status === 'DRAFT' ? <button className={styles.textAction} type="button" onClick={() => void action('/v1/procurement/purchase-orders/' + po.id + '/issue')}>发出</button> : null}<button className={styles.textAction} type="button" onClick={() => setSelectedPo(po.id)}>{selectedPo === po.id ? '已选中' : '查看明细'}</button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <div className={styles.emptyState}><strong>暂无采购订单</strong><p>创建采购单草稿后，可以在这里继续发出、确认与登记履约。</p></div>}
          </section>
        ) : null}

        {activeView === 'receipts' ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><span className={styles.sectionEyebrow}>FULFILLMENT EVIDENCE</span><h2>履约记录</h2><p>采购履约证据仅用于追踪承诺与收货记录，不直接修改库存余额。</p></div>
              <span className={styles.count}>{visibleReceipts.length} 条记录</span>
            </div>
            {loading ? <div className={styles.emptyState}><strong>正在加载履约记录</strong><p>正在读取采购域数据。</p></div> : loadErrors.procurement ? <div className={styles.emptyState}><strong>履约记录加载失败</strong><p>{loadErrors.procurement}</p><button className={styles.textAction} type="button" onClick={() => void reload()}>重新加载</button></div> : visibleReceipts.length ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>发生日期</th><th>采购单</th><th>供应商</th><th>记录类型</th><th>参考编号</th><th>登记时间</th></tr></thead>
                  <tbody>{visibleReceipts.map((receipt) => {
                    const po = data.purchaseOrders.find((item) => item.id === receipt.purchase_order_id);
                    return <tr key={receipt.id}><td>{receipt.occurred_on}</td><td><button className={styles.supplierLink} type="button" onClick={() => { if (po) { setSelectedPo(po.id); setActiveView('orders'); } }}>{po?.po_number ?? '—'}</button></td><td>{po?.supplier_name ?? '—'}</td><td><span className={styles.status} data-tone="neutral">{statusLabel(receipt.kind)}</span></td><td>{receipt.reference || '—'}</td><td>{new Date(receipt.created_at).toLocaleString('zh-CN')}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            ) : <div className={styles.emptyState}><strong>暂无履约记录</strong><p>在采购订单详情中登记供应商承诺或实物收货后，会在这里汇总。</p></div>}
          </section>
        ) : null}

        {selected && activeView === 'orders' ? (
          <section className={styles.detailPanel}>
            <div className={styles.detailHead}>
              <div><span className={styles.sectionEyebrow}>PURCHASE ORDER DETAIL</span><h2>{selected.po_number} · {selected.supplier_name}</h2><p><span className={styles.status} data-tone={statusTone(selected.status)}>{statusLabel(selected.status)}</span> · {selected.currency.trim()} {selected.total_amount}</p></div>
              <button className={styles.closeButton} type="button" onClick={() => setSelectedPo('')}>关闭详情 ×</button>
            </div>
            <div className={styles.lineGrid}>{selectedLines.map((line) => <div className={styles.lineCard} key={line.id}><b>物料行 {line.line_no}</b><span>{line.part_number ?? line.sku}</span><small>{line.ordered_quantity} {line.unit} × {line.unit_price}</small>{line.requested_date ? <small>要求交付：{line.requested_date}</small> : null}</div>)}</div>
            <div className={styles.detailForms}>
              <form className={styles.detailForm} key={'confirm-' + selected.id} onSubmit={(event) => { void post(event, '/v1/procurement/purchase-orders/' + selected.id + '/confirm', (form) => ({ supplierReference: form.get('supplierReference') || undefined, note: form.get('note') || undefined, lines: selectedLines.map(line => ({ purchaseOrderLineId: line.id, confirmedQuantity: form.get('confirmedQuantity-' + line.id), confirmedDate: form.get('confirmedDate-' + line.id) || undefined })) })); }}>
                <div><span className={styles.sectionEyebrow}>SUPPLIER ACKNOWLEDGEMENT</span><h3>确认全部采购明细</h3><p>各行数量和交期独立确认，避免遗漏。</p></div>
                <label><span>供应商确认单号</span><input name="supplierReference" placeholder="确认单号（可选）" /></label>
                {selectedLines.map(line => <div className={styles.lineInput} key={line.id}>
                  <strong>{line.part_number ?? line.sku} · 采购数量 {line.ordered_quantity} {line.unit}</strong>
                  <label><span>确认数量</span><input name={'confirmedQuantity-' + line.id} type="number" min="0.000001" step="any" defaultValue={line.ordered_quantity} required /></label>
                  <label><span>确认交期</span><input name={'confirmedDate-' + line.id} type="date" defaultValue={line.requested_date ?? ''} /></label>
                </div>)}
                <label><span>备注</span><input name="note" placeholder="补充说明（可选）" /></label>
                <button className={styles.buttonPrimary} disabled={busy || selected.status !== 'ISSUED' || !selectedLines.length}>记录全部物料确认</button>
              </form>
              <form className={styles.detailForm} key={'receipt-' + selected.id} onSubmit={(event) => { void post(event, '/v1/procurement/purchase-orders/' + selected.id + '/receipts', (form) => {
                const line = selectedLines.find(item => item.id === form.get('purchaseOrderLineId'));
                if (!line) throw new Error('必须选择本采购单的物料行');
                const quantity = Number(form.get('quantity'));
                if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('本次数量必须大于零');
                return { kind: form.get('kind'), reference: form.get('reference') || undefined, occurredOn: form.get('occurredOn'), note: form.get('note') || undefined, lines: [{ purchaseOrderLineId: line.id, quantity: String(quantity), unit: line.unit }] };
              }); }}>
                <div><span className={styles.sectionEyebrow}>FULFILLMENT EVIDENCE</span><h3>分批收货 / 承诺</h3><p>按物料行逐次登记，未收货的明细不会自动入账。</p></div>
                <label><span>记录类型</span><select name="kind"><option value="PHYSICAL_RECEIPT">实物收货</option><option value="FACTORY_COMMITMENT">工厂承诺</option></select></label>
                <label><span>参考编号</span><input name="reference" placeholder="收货单 / 承诺编号" /></label>
                <label><span>选择采购明细</span><select name="purchaseOrderLineId" required defaultValue=""><option value="" disabled>选择本次收货的物料行</option>{selectedLines.map(line => <option value={line.id} key={line.id}>{line.line_no} · {line.part_number ?? line.sku} · 采购 {line.ordered_quantity} {line.unit}</option>)}</select></label>
                <label><span>本次数量</span><input name="quantity" type="number" min="0.000001" step="any" placeholder="本次数量" required /></label>
                <label><span>发生日期</span><input name="occurredOn" type="date" required /></label>
                <label><span>备注</span><input name="note" placeholder="补充说明（可选）" /></label>
                <button className={styles.buttonPrimary} disabled={busy || !selectedLines.length || !['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(selected.status)}>登记本次履约证据</button>
              </form>
            </div>
            <div className={styles.history}>
              <div className={styles.historyHead}><span className={styles.sectionEyebrow}>AUDIT TRAIL</span><h3>采购状态历史</h3></div>
              {data.snapshots.filter((snapshot) => snapshot.purchase_order_id === selected.id).length ? data.snapshots.filter((snapshot) => snapshot.purchase_order_id === selected.id).map((snapshot) => <div className={styles.historyRow} key={snapshot.id}><b>{statusLabel(snapshot.state)}</b><small>v{snapshot.po_version} · {new Date(snapshot.created_at).toLocaleString('zh-CN')}</small></div>) : <p className={styles.emptyInline}>暂无状态快照。</p>}
            </div>
          </section>
        ) : null}
      </section>
    </OperationsFrame>
  );
}
