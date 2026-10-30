'use client';

import { OperationsFrame } from '../_components/operations-frame';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './finance.module.css';
import { localDateTimeToBusinessInstant } from './finance-timezone.mjs';

// API returns serialized DB rows rendered as-is in this viewer component.
// Property types are intentionally permissive: React escapes all output,
// and typing every column of every finance table client-side adds
// maintenance cost without a security or correctness benefit.
/* eslint-disable @typescript-eslint/no-explicit-any */
type FinanceRow = { [key: string]: any };

type FinanceSummary = {
  documents: FinanceRow[];
  lines: FinanceRow[];
  obligations: FinanceRow[];
  payments: FinanceRow[];
  allocations: FinanceRow[];
  fxRates: FinanceRow[];
  landedBatches: FinanceRow[];
  landedComponents: FinanceRow[];
  landedAllocations: FinanceRow[];
  partnerBalances: FinanceRow[];
  references: { partners: FinanceRow[]; purchaseOrders: FinanceRow[]; commerceOrders: FinanceRow[]; shipments: FinanceRow[]; cargo: FinanceRow[]; customsLines: FinanceRow[] };
};

const emptySummary: FinanceSummary = {
  documents: [], lines: [], obligations: [], payments: [], allocations: [], fxRates: [], landedBatches: [], landedComponents: [], landedAllocations: [], partnerBalances: [],
  references: { partners: [], purchaseOrders: [], commerceOrders: [], shipments: [], cargo: [], customsLines: [] },
};

const labels: Record<string, string> = {
  // Document status uses VOIDED; obligation settlement_status view uses VOID.
  DRAFT: '草稿', VERIFIED: '已核验', POSTED: '已入账', VOIDED: '已作废', VOID: '已作废',
  OPEN: '未结清', PARTIALLY_SETTLED: '部分结清', SETTLED: '已结清',
  // Payment allocation_status view uses PARTIAL (not PARTIALLY_ALLOCATED).
  UNALLOCATED: '未分配', PARTIAL: '部分分配', ALLOCATED: '已分配', REVERSED: '已冲销',
  INBOUND: '收款', OUTBOUND: '付款', AR: '应收', AP: '应付',
  QUANTITY: '按数量', VALUE: '按货值', WEIGHT: '按重量', MANUAL: '手工', FINALIZED: '已冻结',
};
const statusLabel = (value: string | null | undefined) => value ? (labels[value] ?? value.replaceAll('_', ' ')) : '—';
function number(value: unknown): number { return Number(value ?? 0); }
function money(value: unknown, currency?: string): string { return `${number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`; }

export default function FinanceClient({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [message, setMessage] = useState('');
  const [recordQuery, setRecordQuery] = useState('');
  const search = recordQuery.trim().toLowerCase();
  const matches = (row: FinanceRow) => !search || ['document_number','obligation_number','payment_number','partner_name','partner_code','external_reference','document_type','currency','direction','status','settlement_status','allocation_status'].some(key => String(row[key] ?? '').toLowerCase().includes(search));

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) { router.push('/login'); throw new Error('登录状态已失效'); }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function reload() {
    try { setSummary(await api('/v1/finance')); }
    catch (error) { setMessage(error instanceof Error ? error.message : '无法加载财务工作台'); }
  }

  useEffect(() => { void reload(); }, []);

  const openAR = summary.obligations.filter((item) => item.direction === 'AR' && !['SETTLED', 'VOID'].includes(item.settlement_status));
  const openAP = summary.obligations.filter((item) => item.direction === 'AP' && !['SETTLED', 'VOID'].includes(item.settlement_status));
  const unallocatedPayments = summary.payments.filter((item) => item.allocation_status !== 'ALLOCATED' && item.allocation_status !== 'REVERSED');
  const draftLanded = summary.landedBatches.filter((item) => item.status === 'DRAFT');
  const metrics = useMemo(() => ({ ar: openAR.length, ap: openAP.length, unmatched: unallocatedPayments.length, landed: draftLanded.length }), [summary]);

  async function action(path: string, body: unknown = {}) {
    try { await api(path, { method: 'POST', body: JSON.stringify(body) }); setMessage('已更新。'); await reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '无法更新财务数据'); }
  }

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const dueDate = String(form.get('dueDate') ?? '');
    const externalReference = String(form.get('externalReference') ?? '');
    try {
      await api('/v1/finance/documents', { method: 'POST', body: JSON.stringify({
        documentType: form.get('documentType'), partnerId: form.get('partnerId'), currency: form.get('currency'), issueDate: form.get('issueDate'),
        ...(dueDate ? { dueDate } : {}), ...(externalReference ? { externalReference } : {}),
        lines: [{ category: form.get('category'), description: form.get('description'), netAmount: form.get('netAmount'), taxAmount: form.get('taxAmount') || '0' }],
      }) });
      formElement.reset(); setMessage('财务单据已创建。'); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : '无法创建财务单据'); }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const partnerId = String(form.get('partnerId') ?? '');
    try {
      await api('/v1/finance/payments', { method: 'POST', body: JSON.stringify({ direction: form.get('direction'), ...(partnerId ? { partnerId } : {}), currency: form.get('currency'), amount: form.get('amount'), valueDate: form.get('valueDate'), provider: form.get('provider'), idempotencyKey: form.get('idempotencyKey') }) });
      formElement.reset(); setMessage('付款 / 收款证据已记录。'); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : '无法记录付款 / 收款'); }
  }

  async function allocate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const fxRateId = String(form.get('fxRateId') ?? '');
    await action('/v1/finance/allocations', { paymentId: form.get('paymentId'), obligationId: form.get('obligationId'), paymentAmount: form.get('paymentAmount'), obligationAmount: form.get('obligationAmount'), ...(fxRateId ? { fxRateId } : {}) });
  }

  async function createFx(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    let effectiveAt: string;
    try {
      effectiveAt = localDateTimeToBusinessInstant(String(form.get('effectiveAt') ?? ''));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '汇率生效时间无效。');
      return;
    }
    await action('/v1/finance/fx', { baseCurrency: form.get('baseCurrency'), quoteCurrency: form.get('quoteCurrency'), rate: form.get('rate'), effectiveAt, source: form.get('source') });
  }

  async function createLandedBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await action('/v1/finance/landed-cost', { shipmentId: form.get('shipmentId'), currency: form.get('currency'), allocationBasis: form.get('allocationBasis') });
  }

  async function addLandedComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const batchId = String(form.get('batchId')); const sourceCustomsLineId = String(form.get('sourceCustomsLineId') ?? '');
    await action(`/v1/finance/landed-cost/${batchId}/components`, { category: form.get('category'), amount: form.get('amount'), currency: form.get('currency'), batchCurrencyAmount: form.get('batchCurrencyAmount'), capitalizable: form.get('capitalizable') === 'on', ...(sourceCustomsLineId ? { sourceCustomsLineId } : {}) });
  }

  async function allocateLanded(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const componentId = String(form.get('componentId'));
    await action(`/v1/finance/landed-cost/components/${componentId}/allocations`, { cargoId: form.get('cargoId'), allocatedAmount: form.get('allocatedAmount'), basisValue: form.get('basisValue') || undefined });
  }

  return <OperationsFrame embedded={embedded} area="finance" footer="商业财务 · 证据账本" classNames={{ workspace: `workspace ${styles.workspace}` }}>
    <header className={styles.header}>
      <div className={styles.eyebrow}>财务控制 / FINANCE</div>
      <h1>财务管理</h1>
      <p>发票形成应收 / 应付义务，付款作为独立证据存在，分配动作完成结算；汇率必须显式记录，到岸成本读取物流事实但不修改库存数量。</p>
    </header>
    {message ? <div className={styles.notice}>{message}</div> : null}

    <div className={styles.metrics}>
      <div><span>未结应收</span><b>{metrics.ar}</b></div><div><span>未结应付</span><b>{metrics.ap}</b></div><div><span>未分配资金</span><b>{metrics.unmatched}</b></div><div><span>到岸成本草稿</span><b>{metrics.landed}</b></div>
    </div>

    <details className={styles.operationDrawer}><summary>＋ 录入财务单据 / 收付款</summary>
    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createDocument}>
        <span className={styles.label}>财务单据</span><h2>记录发票 / 商业单据</h2><div className={styles.stack}>
          <div className={styles.split}><select name="documentType" defaultValue="SUPPLIER_INVOICE"><option value="SUPPLIER_INVOICE">供应商发票</option><option value="CUSTOMER_INVOICE">客户发票</option><option value="SUPPLIER_CREDIT_NOTE">供应商贷项通知单</option><option value="CUSTOMER_CREDIT_NOTE">客户贷项通知单</option><option value="DEBIT_NOTE">借项通知单</option><option value="OTHER">其他</option></select><select name="partnerId" required defaultValue=""><option value="" disabled>选择合作伙伴</option>{summary.references.partners.map((item) => <option key={item.id} value={item.id}>{item.partner_code} · {item.display_name}</option>)}</select></div>
          <div className={styles.split}><input name="externalReference" placeholder="发票号 / 外部参考号"/><input name="currency" defaultValue="EUR" maxLength={3} required/></div>
          <div className={styles.split}><input name="issueDate" type="date" required/><input name="dueDate" type="date"/></div>
          <select name="category" defaultValue="GOODS"><option value="GOODS">货物</option><option value="FREIGHT">运费</option><option value="INSURANCE">保险</option><option value="DUTY">关税</option><option value="IMPORT_VAT">进口增值税</option><option value="ANTI_DUMPING">反倾销税</option><option value="COUNTERVAILING">反补贴税</option><option value="OPERATIONAL_FEE">运营费用</option><option value="SERVICE">服务</option><option value="OTHER">其他</option></select>
          <input name="description" placeholder="明细说明"/><div className={styles.split}><input name="netAmount" inputMode="decimal" placeholder="未税金额" required/><input name="taxAmount" inputMode="decimal" placeholder="税额" defaultValue="0"/></div><button>创建草稿</button>
        </div>
      </form>

      <form className={`${styles.card} ${styles.compact}`} onSubmit={createPayment}>
        <span className={styles.label}>资金证据</span><h2>记录银行 / 支付事实</h2><div className={styles.stack}>
          <div className={styles.split}><select name="direction" defaultValue="INBOUND"><option value="INBOUND">收款</option><option value="OUTBOUND">付款</option></select><select name="partnerId" defaultValue=""><option value="">暂未匹配合作伙伴</option>{summary.references.partners.map((item) => <option key={item.id} value={item.id}>{item.partner_code} · {item.display_name}</option>)}</select></div>
          <div className={styles.split}><input name="currency" defaultValue="EUR" maxLength={3} required/><input name="amount" placeholder="金额" inputMode="decimal" required/></div>
          <input name="valueDate" type="date" required/><div className={styles.split}><input name="provider" defaultValue="MANUAL" placeholder="来源 / Provider"/><input name="idempotencyKey" placeholder="唯一银行 / 导入键" required/></div><button>记录资金</button>
        </div>
      </form>
    </section>

    </details>
    <section className={styles.panel} aria-label="财务记录查询">
      <div className={styles.sectionHead}><div><h2>财务业务记录</h2><p>单据、应收应付和资金凭证按一行一条展示；操作仍受后端授权与状态校验约束。</p></div>
        <input className={styles.recordSearch} type="search" aria-label="搜索财务记录" placeholder="搜索单号、合作伙伴、状态、币种" value={recordQuery} onChange={event=>setRecordQuery(event.target.value)}/>
      </div>
      <h3 className={styles.tableTitle}>财务单据 · {summary.documents.filter(matches).length}</h3>
      <div className={styles.tableWrap}><table className={styles.recordsTable} aria-label="财务单据">
        <thead><tr><th>单据编号</th><th>合作伙伴</th><th>单据类型</th><th>金额</th><th>状态</th><th>外部参考号</th><th>操作</th></tr></thead>
        <tbody>{summary.documents.filter(matches).slice(0,100).map(item=><tr key={item.id}>
          <td><strong>{item.document_number}</strong><small>版本 {item.version}</small></td><td>{item.partner_name}</td><td>{item.document_type}</td>
          <td>{money(item.total_amount,item.currency)}</td><td><span className={styles.badge}>{statusLabel(item.status)}</span></td>
          <td>{item.external_reference??'—'}</td><td className={styles.actions}>
            {item.status==='DRAFT'?<button onClick={()=>void action(`/v1/finance/documents/${item.id}/verify`,{expectedVersion:item.version})}>核验</button>:null}
            {item.status==='VERIFIED'?<><button onClick={()=>void action(`/v1/finance/documents/${item.id}/post`,{expectedVersion:item.version})}>入账</button><button className={styles.secondary} onClick={()=>void action(`/v1/finance/documents/${item.id}/draft`,{expectedVersion:item.version})}>退回草稿</button></>:null}
          </td></tr>)}{!summary.documents.filter(matches).length?<tr><td colSpan={7} className={styles.empty}>没有匹配的财务单据</td></tr>:null}</tbody>
      </table></div>
      <h3 className={styles.tableTitle}>应收 / 应付义务 · {summary.obligations.filter(matches).length}</h3>
      <div className={styles.tableWrap}><table className={styles.recordsTable} aria-label="应收应付义务">
        <thead><tr><th>义务单号</th><th>合作伙伴</th><th>方向</th><th>未结清金额</th><th>结算状态</th><th>逾期</th></tr></thead>
        <tbody>{summary.obligations.filter(matches).slice(0,100).map(item=><tr key={item.id}>
          <td><strong>{item.obligation_number}</strong></td><td>{item.partner_name}</td><td>{statusLabel(item.direction)}</td>
          <td>{money(item.outstanding_amount,item.currency)}</td><td><span className={styles.badge}>{statusLabel(item.settlement_status)}</span></td>
          <td>{number(item.days_overdue)>0?`逾期 ${item.days_overdue} 天`:'未逾期'}</td>
        </tr>)}{!summary.obligations.filter(matches).length?<tr><td colSpan={6} className={styles.empty}>没有匹配的应收应付记录</td></tr>:null}</tbody>
      </table></div>
      <h3 className={styles.tableTitle}>资金流水 · {summary.payments.filter(matches).length}</h3>
      <div className={styles.tableWrap}><table className={styles.recordsTable} aria-label="收付款流水">
        <thead><tr><th>资金编号</th><th>合作伙伴</th><th>方向</th><th>金额</th><th>分配状态</th><th>未分配金额</th></tr></thead>
        <tbody>{summary.payments.filter(matches).slice(0,100).map(item=><tr key={item.id}>
          <td><strong>{item.payment_number}</strong></td><td>{item.partner_name??'暂未匹配'}</td><td>{statusLabel(item.direction)}</td>
          <td>{money(item.amount,item.currency)}</td><td><span className={styles.badge}>{statusLabel(item.allocation_status)}</span></td><td>{money(item.unallocated_amount,item.currency)}</td>
        </tr>)}{!summary.payments.filter(matches).length?<tr><td colSpan={6} className={styles.empty}>没有匹配的资金记录</td></tr>:null}</tbody>
      </table></div>
    </section>

    <details className={styles.operationDrawer}><summary>＋ 资金分配 / 记录汇率</summary>
    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={allocate}>
        <span className={styles.label}>结算</span><h2>资金 → 应收 / 应付义务</h2><div className={styles.stack}>
          <select name="paymentId" required defaultValue=""><option value="" disabled>选择资金记录</option>{unallocatedPayments.map((item) => <option key={item.id} value={item.id}>{item.payment_number} · {money(item.unallocated_amount, item.currency)}</option>)}</select>
          <select name="obligationId" required defaultValue=""><option value="" disabled>选择义务</option>{[...openAR, ...openAP].map((item) => <option key={item.id} value={item.id}>{item.obligation_number} · {statusLabel(item.direction)} · {money(item.outstanding_amount, item.currency)}</option>)}</select>
          <div className={styles.split}><input name="paymentAmount" placeholder="资金金额" required/><input name="obligationAmount" placeholder="义务结算金额" required/></div>
          <select name="fxRateId" defaultValue=""><option value="">同币种，无需汇率</option>{summary.fxRates.map((item) => <option key={item.id} value={item.id}>{item.base_currency}/{item.quote_currency} · {item.rate}</option>)}</select><button>执行分配</button>
        </div>
      </form>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createFx}>
        <span className={styles.label}>汇率证据</span><h2>记录汇率</h2><div className={styles.stack}><div className={styles.split}><input name="baseCurrency" defaultValue="USD" maxLength={3}/><input name="quoteCurrency" defaultValue="EUR" maxLength={3}/></div><input name="rate" placeholder="汇率，例如 0.900000" required/><label>生效时间（Europe/Berlin）<input name="effectiveAt" type="datetime-local" required aria-label="汇率生效时间（Europe/Berlin）"/></label><input name="source" placeholder="汇率来源 / 依据" required/><button>记录汇率</button><p className={styles.hint}>跨币种结算必须存在明确且兼容的汇率证据，否则系统拒绝结算。</p></div>
      </form>
    </section>

    </details>
    <section className={styles.panel}>
      <div className={styles.sectionHead}><div><h2>合作伙伴余额 · {summary.partnerBalances.length}</h2><p>同币种、同方向分别显示，不跨币种合计。</p></div></div>
      <div className={styles.tableWrap}><table className={styles.recordsTable} aria-label="合作伙伴余额">
        <thead><tr><th>合作伙伴</th><th>编号</th><th>方向</th><th>币种</th><th>原始金额</th><th>未结金额</th></tr></thead>
        <tbody>{summary.partnerBalances.filter(matches).map((item,index)=><tr key={`${item.partner_id}-${item.currency}-${item.direction}-${index}`}>
          <td>{item.partner_name}</td><td>{item.partner_code}</td><td>{statusLabel(item.direction)}</td><td>{item.currency}</td>
          <td>{money(item.original_amount)}</td><td className={number(item.outstanding_amount)>0?styles.danger:styles.positive}>{money(item.outstanding_amount)}</td>
        </tr>)}{!summary.partnerBalances.filter(matches).length?<tr><td colSpan={6} className={styles.empty}>暂无匹配的合作伙伴余额</td></tr>:null}</tbody>
      </table></div>
    </section>

    <details className={styles.operationDrawer}><summary>＋ 到岸成本处理 / 冻结</summary>
    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createLandedBatch}><span className={styles.label}>到岸成本</span><h2>创建 Shipment 成本批次</h2><div className={styles.stack}><select name="shipmentId" required defaultValue=""><option value="" disabled>选择 Shipment</option>{summary.references.shipments.map((item) => <option key={item.id} value={item.id}>{item.shipment_number} · {statusLabel(item.status)}</option>)}</select><div className={styles.split}><input name="currency" defaultValue="EUR"/><select name="allocationBasis" defaultValue="QUANTITY"><option value="QUANTITY">按数量</option><option value="VALUE">按货值</option><option value="WEIGHT">按重量</option><option value="MANUAL">手工</option></select></div><button>创建批次</button></div></form>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={addLandedComponent}><span className={styles.label}>成本组成</span><h2>添加运费 / 关税 / VAT 事实</h2><div className={styles.stack}><select name="batchId" required defaultValue=""><option value="" disabled>选择草稿批次</option>{draftLanded.map((item) => <option key={item.id} value={item.id}>{item.batch_number} · {item.shipment_number}</option>)}</select><select name="category" defaultValue="FREIGHT"><option value="FREIGHT">运费</option><option value="INSURANCE">保险</option><option value="DUTY">关税</option><option value="IMPORT_VAT">进口增值税</option><option value="ANTI_DUMPING">反倾销税</option><option value="COUNTERVAILING">反补贴税</option><option value="OPERATIONAL_FEE">运营费用</option><option value="OTHER">其他</option></select><div className={styles.split}><input name="amount" placeholder="原币金额" required/><input name="currency" defaultValue="EUR"/></div><input name="batchCurrencyAmount" placeholder="批次币种金额" required/><select name="sourceCustomsLineId" defaultValue=""><option value="">不关联报关税费来源</option>{summary.references.customsLines.map((item) => <option key={item.id} value={item.id}>{item.declaration_code} · {item.hs_code}</option>)}</select><label><input name="capitalizable" type="checkbox" defaultChecked style={{width:'auto',marginRight:8}}/>计入到岸成本</label><button>添加成本组成</button></div></form>
    </section>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={allocateLanded}><span className={styles.label}>成本分配</span><h2>成本组成 → Shipment 货物</h2><div className={styles.stack}><select name="componentId" required defaultValue=""><option value="" disabled>选择成本组成</option>{summary.landedComponents.filter((item) => draftLanded.some((batch) => batch.id === item.batch_id)).map((item) => <option key={item.id} value={item.id}>{item.category} · {money(item.batch_currency_amount, item.currency)}</option>)}</select><select name="cargoId" required defaultValue=""><option value="" disabled>选择货物</option>{summary.references.cargo.map((item) => <option key={item.id} value={item.id}>{item.sku ?? item.frame_number ?? item.item_kind} · 数量 {item.quantity}</option>)}</select><div className={styles.split}><input name="allocatedAmount" placeholder="分配金额" required/><input name="basisValue" placeholder="分配依据值"/></div><button>分配成本</button></div></form>
      <div className={styles.panel}><span className={styles.label}>冻结</span><h2>冻结到岸成本证据</h2><p className={styles.hint}>所有需要资本化的成本组成必须完成分配后才能冻结。进口 VAT 可以明确保留为不资本化项目。</p><div className={styles.stack}>{draftLanded.map((item) => <div className={styles.row} key={item.id}><span><b>{item.batch_number}</b><br/><small>{item.shipment_number}</small></span><span>{statusLabel(item.allocation_basis)}</span><span>{item.currency}</span><span className={styles.actions}><button onClick={() => void action(`/v1/finance/landed-cost/${item.id}/finalize`)}>冻结</button></span></div>)}{!draftLanded.length ? <p className={styles.empty}>暂无到岸成本草稿批次。</p> : null}</div></div>
    </section>
    </details>
  </OperationsFrame>;
}
