'use client';

import { AppShell } from '@alsvid/ui';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { navigationFor } from '../app-navigation';
import styles from './finance.module.css';

type FinanceSummary = {
  documents: any[];
  lines: any[];
  obligations: any[];
  payments: any[];
  allocations: any[];
  fxRates: any[];
  landedBatches: any[];
  landedComponents: any[];
  landedAllocations: any[];
  partnerBalances: any[];
  references: { partners: any[]; purchaseOrders: any[]; commerceOrders: any[]; shipments: any[]; cargo: any[]; customsLines: any[] };
};

const emptySummary: FinanceSummary = {
  documents: [], lines: [], obligations: [], payments: [], allocations: [], fxRates: [], landedBatches: [], landedComponents: [], landedAllocations: [], partnerBalances: [],
  references: { partners: [], purchaseOrders: [], commerceOrders: [], shipments: [], cargo: [], customsLines: [] },
};

function number(value: unknown): number { return Number(value ?? 0); }
function money(value: unknown, currency?: string): string { return `${number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`; }

export default function FinanceClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<FinanceSummary>(emptySummary);
  const [message, setMessage] = useState('');

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) { router.push('/login'); throw new Error('Session expired'); }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? 'Request failed');
    return payload.data;
  }

  async function reload() {
    try { setSummary(await api('/v1/finance')); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load Finance workspace'); }
  }

  useEffect(() => { void reload(); }, []);

  const openAR = summary.obligations.filter((item) => item.direction === 'AR' && !['SETTLED', 'VOID'].includes(item.settlement_status));
  const openAP = summary.obligations.filter((item) => item.direction === 'AP' && !['SETTLED', 'VOID'].includes(item.settlement_status));
  const unallocatedPayments = summary.payments.filter((item) => item.allocation_status !== 'ALLOCATED' && item.allocation_status !== 'REVERSED');
  const draftLanded = summary.landedBatches.filter((item) => item.status === 'DRAFT');
  const metrics = useMemo(() => ({ ar: openAR.length, ap: openAP.length, unmatched: unallocatedPayments.length, landed: draftLanded.length }), [summary]);

  async function action(path: string, body: unknown = {}) {
    try { await api(path, { method: 'POST', body: JSON.stringify(body) }); setMessage('Updated.'); await reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update Finance'); }
  }

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const dueDate = String(form.get('dueDate') ?? '');
    const externalReference = String(form.get('externalReference') ?? '');
    try {
      await api('/v1/finance/documents', { method: 'POST', body: JSON.stringify({
        documentType: form.get('documentType'), partnerId: form.get('partnerId'), currency: form.get('currency'), issueDate: form.get('issueDate'),
        ...(dueDate ? { dueDate } : {}), ...(externalReference ? { externalReference } : {}),
        lines: [{ category: form.get('category'), description: form.get('description'), netAmount: form.get('netAmount'), taxAmount: form.get('taxAmount') || '0' }],
      }) });
      event.currentTarget.reset(); setMessage('Finance document created.'); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create document'); }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const partnerId = String(form.get('partnerId') ?? '');
    try {
      await api('/v1/finance/payments', { method: 'POST', body: JSON.stringify({ direction: form.get('direction'), ...(partnerId ? { partnerId } : {}), currency: form.get('currency'), amount: form.get('amount'), valueDate: form.get('valueDate'), provider: form.get('provider'), idempotencyKey: form.get('idempotencyKey') }) });
      event.currentTarget.reset(); setMessage('Payment evidence recorded.'); await reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to record payment'); }
  }

  async function allocate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const fxRateId = String(form.get('fxRateId') ?? '');
    await action('/v1/finance/allocations', { paymentId: form.get('paymentId'), obligationId: form.get('obligationId'), paymentAmount: form.get('paymentAmount'), obligationAmount: form.get('obligationAmount'), ...(fxRateId ? { fxRateId } : {}) });
  }

  async function createFx(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await action('/v1/finance/fx', { baseCurrency: form.get('baseCurrency'), quoteCurrency: form.get('quoteCurrency'), rate: form.get('rate'), effectiveAt: form.get('effectiveAt'), source: form.get('source') });
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

  return <AppShell navigation={navigationFor('/finance')} footer="Commercial finance · evidence ledger" classNames={{ workspace: `workspace ${styles.workspace}` }}>
    <header className={styles.header}>
      <div className={styles.eyebrow}>FINANCE CONTROL</div>
      <h1>Money follows the business facts — it never replaces them.</h1>
      <p>Invoices create obligations, payments remain separate evidence, allocations settle balances, FX is explicit, and landed cost reads Logistics without changing inventory quantity.</p>
    </header>
    {message ? <div className={styles.notice}>{message}</div> : null}

    <div className={styles.metrics}>
      <div><span>OPEN AR ITEMS</span><b>{metrics.ar}</b></div><div><span>OPEN AP ITEMS</span><b>{metrics.ap}</b></div><div><span>UNALLOCATED PAYMENTS</span><b>{metrics.unmatched}</b></div><div><span>DRAFT LANDED COST</span><b>{metrics.landed}</b></div>
    </div>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createDocument}>
        <span className={styles.label}>DOCUMENT</span><h2>Record invoice / commercial document</h2><div className={styles.stack}>
          <div className={styles.split}><select name="documentType" defaultValue="SUPPLIER_INVOICE"><option value="SUPPLIER_INVOICE">Supplier invoice</option><option value="CUSTOMER_INVOICE">Customer invoice</option><option value="SUPPLIER_CREDIT_NOTE">Supplier credit note</option><option value="CUSTOMER_CREDIT_NOTE">Customer credit note</option><option value="DEBIT_NOTE">Debit note</option><option value="OTHER">Other</option></select><select name="partnerId" required defaultValue=""><option value="" disabled>Partner</option>{summary.references.partners.map((item) => <option key={item.id} value={item.id}>{item.partner_code} · {item.display_name}</option>)}</select></div>
          <div className={styles.split}><input name="externalReference" placeholder="Invoice / external reference"/><input name="currency" defaultValue="EUR" maxLength={3} required/></div>
          <div className={styles.split}><input name="issueDate" type="date" required/><input name="dueDate" type="date"/></div>
          <select name="category" defaultValue="GOODS"><option>GOODS</option><option>FREIGHT</option><option>INSURANCE</option><option>DUTY</option><option>IMPORT_VAT</option><option>ANTI_DUMPING</option><option>COUNTERVAILING</option><option>OPERATIONAL_FEE</option><option>SERVICE</option><option>OTHER</option></select>
          <input name="description" placeholder="Line description"/><div className={styles.split}><input name="netAmount" inputMode="decimal" placeholder="Net amount" required/><input name="taxAmount" inputMode="decimal" placeholder="Tax amount" defaultValue="0"/></div><button>Create draft</button>
        </div>
      </form>

      <form className={`${styles.card} ${styles.compact}`} onSubmit={createPayment}>
        <span className={styles.label}>PAYMENT EVIDENCE</span><h2>Record bank / payment fact</h2><div className={styles.stack}>
          <div className={styles.split}><select name="direction" defaultValue="INBOUND"><option value="INBOUND">Inbound</option><option value="OUTBOUND">Outbound</option></select><select name="partnerId" defaultValue=""><option value="">Unmatched Partner</option>{summary.references.partners.map((item) => <option key={item.id} value={item.id}>{item.partner_code} · {item.display_name}</option>)}</select></div>
          <div className={styles.split}><input name="currency" defaultValue="EUR" maxLength={3} required/><input name="amount" placeholder="Amount" inputMode="decimal" required/></div>
          <input name="valueDate" type="date" required/><div className={styles.split}><input name="provider" defaultValue="MANUAL" placeholder="Provider"/><input name="idempotencyKey" placeholder="Unique bank/import key" required/></div><button>Record payment</button>
        </div>
      </form>
    </section>

    <section className={`${styles.panel} ${styles.wide}`}>
      <div className={styles.sectionHead}><div><span className={styles.label}>DOCUMENTS</span><h2>Document → obligation</h2></div><p>Posted evidence becomes immutable.</p></div>
      <div className={styles.table}>{summary.documents.slice(0, 40).map((item) => <div className={styles.row} key={item.id}><span><b>{item.document_number}</b><br/><small>{item.partner_name} · {item.document_type}</small></span><span>{money(item.total_amount, item.currency)}<br/><small>{item.external_reference ?? 'No external ref'}</small></span><span><i className={styles.badge}>{item.status}</i><br/><small>v{item.version}</small></span><span className={styles.actions}>{item.status === 'DRAFT' ? <button onClick={() => void action(`/v1/finance/documents/${item.id}/verify`, { expectedVersion: item.version })}>Verify</button> : null}{item.status === 'VERIFIED' ? <><button onClick={() => void action(`/v1/finance/documents/${item.id}/post`, { expectedVersion: item.version })}>Post</button><button className={styles.secondary} onClick={() => void action(`/v1/finance/documents/${item.id}/draft`, { expectedVersion: item.version })}>Draft</button></> : null}</span></div>)}{!summary.documents.length ? <p className={styles.empty}>No Finance documents yet.</p> : null}</div>
    </section>

    <section className={styles.grid}>
      <div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>AR / AP</span><h2>Outstanding obligations</h2></div></div><div className={styles.table}>{summary.obligations.slice(0, 50).map((item) => <div className={styles.row} key={item.id}><span><b>{item.obligation_number}</b><br/><small>{item.partner_name}</small></span><span>{item.direction} · {money(item.outstanding_amount, item.currency)}</span><span><i className={styles.badge}>{item.settlement_status}</i></span><span><small>{number(item.days_overdue) > 0 ? `${item.days_overdue} days overdue` : 'Current'}</small></span></div>)}{!summary.obligations.length ? <p className={styles.empty}>No obligations yet.</p> : null}</div></div>
      <div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>PAYMENTS</span><h2>Unallocated money</h2></div></div><div className={styles.table}>{summary.payments.slice(0, 50).map((item) => <div className={styles.row} key={item.id}><span><b>{item.payment_number}</b><br/><small>{item.partner_name ?? 'Unmatched'}</small></span><span>{item.direction} · {money(item.amount, item.currency)}</span><span><i className={styles.badge}>{item.allocation_status}</i></span><span>{money(item.unallocated_amount, item.currency)}</span></div>)}{!summary.payments.length ? <p className={styles.empty}>No payments yet.</p> : null}</div></div>
    </section>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={allocate}>
        <span className={styles.label}>SETTLEMENT</span><h2>Allocate payment → obligation</h2><div className={styles.stack}>
          <select name="paymentId" required defaultValue=""><option value="" disabled>Payment</option>{unallocatedPayments.map((item) => <option key={item.id} value={item.id}>{item.payment_number} · {money(item.unallocated_amount, item.currency)}</option>)}</select>
          <select name="obligationId" required defaultValue=""><option value="" disabled>Obligation</option>{[...openAR, ...openAP].map((item) => <option key={item.id} value={item.id}>{item.obligation_number} · {item.direction} · {money(item.outstanding_amount, item.currency)}</option>)}</select>
          <div className={styles.split}><input name="paymentAmount" placeholder="Payment amount" required/><input name="obligationAmount" placeholder="Obligation amount" required/></div>
          <select name="fxRateId" defaultValue=""><option value="">No FX (same currency)</option>{summary.fxRates.map((item) => <option key={item.id} value={item.id}>{item.base_currency}/{item.quote_currency} · {item.rate}</option>)}</select><button>Allocate</button>
        </div>
      </form>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createFx}>
        <span className={styles.label}>FX EVIDENCE</span><h2>Record exchange rate</h2><div className={styles.stack}><div className={styles.split}><input name="baseCurrency" defaultValue="USD" maxLength={3}/><input name="quoteCurrency" defaultValue="EUR" maxLength={3}/></div><input name="rate" placeholder="Rate e.g. 0.900000" required/><input name="effectiveAt" type="datetime-local" required/><input name="source" placeholder="Source / provenance" required/><button>Record FX</button><p className={styles.hint}>Cross-currency settlement is rejected unless explicit compatible FX evidence exists.</p></div>
      </form>
    </section>

    <section className={`${styles.panel} ${styles.wide}`}>
      <div className={styles.sectionHead}><div><span className={styles.label}>PARTNER BALANCES</span><h2>Balances stay separated by currency.</h2></div><p>No meaningless EUR + USD combined total.</p></div><div className={styles.table}>{summary.partnerBalances.map((item, index) => <div className={styles.row} key={`${item.partner_id}-${item.currency}-${item.direction}-${index}`}><span><b>{item.partner_name}</b><br/><small>{item.partner_code}</small></span><span>{item.direction} · {item.currency}</span><span>Original {money(item.original_amount)}</span><span className={number(item.outstanding_amount) > 0 ? styles.danger : styles.positive}>Outstanding {money(item.outstanding_amount)}</span></div>)}{!summary.partnerBalances.length ? <p className={styles.empty}>No Partner balances yet.</p> : null}</div>
    </section>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={createLandedBatch}><span className={styles.label}>LANDED COST</span><h2>Start Shipment cost batch</h2><div className={styles.stack}><select name="shipmentId" required defaultValue=""><option value="" disabled>Shipment</option>{summary.references.shipments.map((item) => <option key={item.id} value={item.id}>{item.shipment_number} · {item.status}</option>)}</select><div className={styles.split}><input name="currency" defaultValue="EUR"/><select name="allocationBasis" defaultValue="QUANTITY"><option>QUANTITY</option><option>VALUE</option><option>WEIGHT</option><option>MANUAL</option></select></div><button>Create batch</button></div></form>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={addLandedComponent}><span className={styles.label}>COST COMPONENT</span><h2>Add freight / duty / VAT fact</h2><div className={styles.stack}><select name="batchId" required defaultValue=""><option value="" disabled>Draft batch</option>{draftLanded.map((item) => <option key={item.id} value={item.id}>{item.batch_number} · {item.shipment_number}</option>)}</select><select name="category" defaultValue="FREIGHT"><option>FREIGHT</option><option>INSURANCE</option><option>DUTY</option><option>IMPORT_VAT</option><option>ANTI_DUMPING</option><option>COUNTERVAILING</option><option>OPERATIONAL_FEE</option><option>OTHER</option></select><div className={styles.split}><input name="amount" placeholder="Source amount" required/><input name="currency" defaultValue="EUR"/></div><input name="batchCurrencyAmount" placeholder="Amount in batch currency" required/><select name="sourceCustomsLineId" defaultValue=""><option value="">No customs source</option>{summary.references.customsLines.map((item) => <option key={item.id} value={item.id}>{item.declaration_code} · {item.hs_code}</option>)}</select><label><input name="capitalizable" type="checkbox" defaultChecked style={{width:'auto',marginRight:8}}/>Capitalizable into landed cost</label><button>Add component</button></div></form>
    </section>

    <section className={styles.grid}>
      <form className={`${styles.card} ${styles.compact}`} onSubmit={allocateLanded}><span className={styles.label}>COST ALLOCATION</span><h2>Allocate component → Shipment cargo</h2><div className={styles.stack}><select name="componentId" required defaultValue=""><option value="" disabled>Component</option>{summary.landedComponents.filter((item) => draftLanded.some((batch) => batch.id === item.batch_id)).map((item) => <option key={item.id} value={item.id}>{item.category} · {money(item.batch_currency_amount, item.currency)}</option>)}</select><select name="cargoId" required defaultValue=""><option value="" disabled>Cargo</option>{summary.references.cargo.map((item) => <option key={item.id} value={item.id}>{item.sku ?? item.frame_number ?? item.item_kind} · qty {item.quantity}</option>)}</select><div className={styles.split}><input name="allocatedAmount" placeholder="Allocated amount" required/><input name="basisValue" placeholder="Basis value"/></div><button>Allocate cost</button></div></form>
      <div className={styles.panel}><span className={styles.label}>FINALIZATION</span><h2>Freeze landed-cost evidence</h2><p className={styles.hint}>All capitalizable components must be fully allocated before finalization. Import VAT can remain explicitly non-capitalizable.</p><div className={styles.stack}>{draftLanded.map((item) => <div className={styles.row} key={item.id}><span><b>{item.batch_number}</b><br/><small>{item.shipment_number}</small></span><span>{item.allocation_basis}</span><span>{item.currency}</span><span className={styles.actions}><button onClick={() => void action(`/v1/finance/landed-cost/${item.id}/finalize`)}>Finalize</button></span></div>)}{!draftLanded.length ? <p className={styles.empty}>No draft landed-cost batches.</p> : null}</div></div>
    </section>
  </AppShell>;
}
