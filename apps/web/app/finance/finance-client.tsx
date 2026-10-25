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
      <h1>资金跟随业务事实，而不是替代业务事实。</h1>
      <p>发票形成应收 / 应付义务，付款作为独立证据存在，分配动作完成结算；汇率必须显式记录，到岸成本读取物流事实但不修改库存数量。</p>
    </header>
    {message ? <div className={styles.notice}>{message}</div> : null}

    <div className={styles.metrics}>
      <div><span>未结应收</span><b>{metrics.ar}</b></div><div><span>未结应付</span><b>{metrics.ap}</b></div><div><span>未分配资金</span><b>{metrics.unmatched}</b></div><div><span>到岸成本草稿</span><b>{metrics.landed}</b></div>
    </div>

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

    <section className={`${styles.panel} ${styles.wide}`}>
      <div className={styles.sectionHead}><div><span className={styles.label}>单据</span><h2>单据 → 应收 / 应付义务</h2></div><p>入账后的证据进入不可变状态。</p></div>
      <div className={styles.table}>{summary.documents.slice(0, 40).map((item) => <div className={styles.row} key={item.id}><span><b>{item.document_number}</b><br/><small>{item.partner_name} · {item.document_type}</small></span><span>{money(item.total_amount, item.currency)}<br/><small>{item.external_reference ?? '无外部参考号'}</small></span><span><i className={styles.badge}>{statusLabel(item.status)}</i><br/><small>v{item.version}</small></span><span className={styles.actions}>{item.status === 'DRAFT' ? <button onClick={() => void action(`/v1/finance/documents/${item.id}/verify`, { expectedVersion: item.version })}>核验</button> : null}{item.status === 'VERIFIED' ? <><button onClick={() => void action(`/v1/finance/documents/${item.id}/post`, { expectedVersion: item.version })}>入账</button><button className={styles.secondary} onClick={() => void action(`/v1/finance/documents/${item.id}/draft`, { expectedVersion: item.version })}>退回草稿</button></> : null}</span></div>)}{!summary.documents.length ? <p className={styles.empty}>暂无财务单据。</p> : null}</div>
    </section>

    <section className={styles.grid}>
      <div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>应收 / 应付</span><h2>未结清义务</h2></div></div><div className={styles.table}>{summary.obligations.slice(0, 50).map((item) => <div className={styles.row} key={item.id}><span><b>{item.obligation_number}</b><br/><small>{item.partner_name}</small></span><span>{statusLabel(item.direction)} · {money(item.outstanding_amount, item.currency)}</span><span><i className={styles.badge}>{statusLabel(item.settlement_status)}</i></span><span><small>{number(item.days_overdue) > 0 ? `逾期 ${item.days_overdue} 天` : '未逾期'}</small></span></div>)}{!summary.obligations.length ? <p className={styles.empty}>暂无应收 / 应付义务。</p> : null}</div></div>
      <div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>资金流水</span><h2>未分配资金</h2></div></div><div className={styles.table}>{summary.payments.slice(0, 50).map((item) => <div className={styles.row} key={item.id}><span><b>{item.payment_number}</b><br/><small>{item.partner_name ?? '暂未匹配'}</small></span><span>{statusLabel(item.direction)} · {money(item.amount, item.currency)}</span><span><i className={styles.badge}>{statusLabel(item.allocation_status)}</i></span><span>{money(item.unallocated_amount, item.currency)}</span></div>)}{!summary.payments.length ? <p className={styles.empty}>暂无资金记录。</p> : null}</div></div>
    </section>

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

    <section className={`${styles.panel} ${styles.wide}`}>
      <div className={styles.sectionHead}><div><span className={styles.label}>合作伙伴余额</span><h2>不同币种余额保持分离。</h2></div><p>不会把 EUR 与 USD 相加成没有意义的合计。</p></div><div className={styles.table}>{summary.partnerBalances.map((item, index) => <div className={styles.row} key={`${item.partner_id}-${item.currency}-${item.direction}-${index}`}><span><b>{item.partner_name}</b><br/><small>{item.partner_code}</small></span><span>{statusLabel(item.direction)} · {item.currency}</span><span>原始金额 {money(item.original_amount)}</span><span className={number(item.outstanding_amount) > 0 ? styles.danger : styles.positive}>未结金额 {money(item.outstanding_amount)}</span></div>)}{!summary.partnerBalances.length ? <p className={styles.empty}>暂无合作伙伴余额。</p> : null}</div>
    </section>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createLandedBatch}><span className={styles.label}>到岸成本</span><h2>创建 Shipment 成本批次</h2><div className={styles.stack}><select name="shipmentId" required defaultValue=""><option value="" disabled>选择 Shipment</option>{summary.references.shipments.map((item) => <option key={item.id} value={item.id}>{item.shipment_number} · {statusLabel(item.status)}</option>)}</select><div className={styles.split}><input name="currency" defaultValue="EUR"/><select name="allocationBasis" defaultValue="QUANTITY"><option value="QUANTITY">按数量</option><option value="VALUE">按货值</option><option value="WEIGHT">按重量</option><option value="MANUAL">手工</option></select></div><button>创建批次</button></div></form>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={addLandedComponent}><span className={styles.label}>成本组成</span><h2>添加运费 / 关税 / VAT 事实</h2><div className={styles.stack}><select name="batchId" required defaultValue=""><option value="" disabled>选择草稿批次</option>{draftLanded.map((item) => <option key={item.id} value={item.id}>{item.batch_number} · {item.shipment_number}</option>)}</select><select name="category" defaultValue="FREIGHT"><option value="FREIGHT">运费</option><option value="INSURANCE">保险</option><option value="DUTY">关税</option><option value="IMPORT_VAT">进口增值税</option><option value="ANTI_DUMPING">反倾销税</option><option value="COUNTERVAILING">反补贴税</option><option value="OPERATIONAL_FEE">运营费用</option><option value="OTHER">其他</option></select><div className={styles.split}><input name="amount" placeholder="原币金额" required/><input name="currency" defaultValue="EUR"/></div><input name="batchCurrencyAmount" placeholder="批次币种金额" required/><select name="sourceCustomsLineId" defaultValue=""><option value="">不关联报关税费来源</option>{summary.references.customsLines.map((item) => <option key={item.id} value={item.id}>{item.declaration_code} · {item.hs_code}</option>)}</select><label><input name="capitalizable" type="checkbox" defaultChecked style={{width:'auto',marginRight:8}}/>计入到岸成本</label><button>添加成本组成</button></div></form>
    </section>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={allocateLanded}><span className={styles.label}>成本分配</span><h2>成本组成 → Shipment 货物</h2><div className={styles.stack}><select name="componentId" required defaultValue=""><option value="" disabled>选择成本组成</option>{summary.landedComponents.filter((item) => draftLanded.some((batch) => batch.id === item.batch_id)).map((item) => <option key={item.id} value={item.id}>{item.category} · {money(item.batch_currency_amount, item.currency)}</option>)}</select><select name="cargoId" required defaultValue=""><option value="" disabled>选择货物</option>{summary.references.cargo.map((item) => <option key={item.id} value={item.id}>{item.sku ?? item.frame_number ?? item.item_kind} · 数量 {item.quantity}</option>)}</select><div className={styles.split}><input name="allocatedAmount" placeholder="分配金额" required/><input name="basisValue" placeholder="分配依据值"/></div><button>分配成本</button></div></form>
      <div className={styles.panel}><span className={styles.label}>冻结</span><h2>冻结到岸成本证据</h2><p className={styles.hint}>所有需要资本化的成本组成必须完成分配后才能冻结。进口 VAT 可以明确保留为不资本化项目。</p><div className={styles.stack}>{draftLanded.map((item) => <div className={styles.row} key={item.id}><span><b>{item.batch_number}</b><br/><small>{item.shipment_number}</small></span><span>{statusLabel(item.allocation_basis)}</span><span>{item.currency}</span><span className={styles.actions}><button onClick={() => void action(`/v1/finance/landed-cost/${item.id}/finalize`)}>冻结</button></span></div>)}{!draftLanded.length ? <p className={styles.empty}>暂无到岸成本草稿批次。</p> : null}</div></div>
    </section>
  </OperationsFrame>;
}
