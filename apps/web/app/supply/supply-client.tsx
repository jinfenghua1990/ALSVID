'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './supply.module.css';

type ItemType = 'PART' | 'SKU';
type Partner = { id: string; partnerCode: string; displayName: string; roles: string[] };
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

export default function SupplyClient() {
  const router = useRouter();
  const [data, setData] = useState<Procurement>(empty);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [message, setMessage] = useState('');
  const [selectedPo, setSelectedPo] = useState('');
  const [quoteItemType, setQuoteItemType] = useState<ItemType>('PART');
  const [poItemType, setPoItemType] = useState<ItemType>('PART');

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('Session expired');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? 'Request failed');
    return payload.data;
  }

  async function reload() {
    try {
      const [proc, partnerData, engineering, catalog] = await Promise.all([
        api('/v1/procurement'),
        api('/v1/partners'),
        api('/v1/engineering'),
        api('/v1/product/catalog'),
      ]);
      setData(proc);
      setPartners(partnerData.filter((partner: Partner) => partner.roles.includes('SUPPLIER') || partner.roles.includes('FACTORY')));
      setParts(engineering.parts);
      setSkus(catalog.skus);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load Supply workspace');
    }
  }

  useEffect(() => { void reload(); }, []);

  const metrics = useMemo(
    () => ['DRAFT', 'ISSUED', 'CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED'].map((status) => [status, data.purchaseOrders.filter((po) => po.status === status).length] as const),
    [data],
  );
  const selected = data.purchaseOrders.find((po) => po.id === selectedPo) ?? null;
  const selectedLines = selected ? data.purchaseOrderLines.filter((line) => line.purchase_order_id === selected.id) : [];

  async function post(event: FormEvent<HTMLFormElement>, endpoint: string, build: (form: FormData) => unknown) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(build(form)) });
      setMessage('Saved.');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save');
    }
  }

  async function action(endpoint: string, body: unknown = {}) {
    try {
      await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setMessage('Updated.');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update');
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

  function itemOptions(type: ItemType) {
    return type === 'SKU'
      ? skus.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)
      : parts.map((item) => <option key={item.id} value={item.id}>{item.part_number} · {item.name}</option>);
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.rail}>
        <a className={styles.brand} href="/">ALSVID</a>
        <nav><a href="/">Overview</a><a href="/product">Product</a><a className={styles.active} href="/supply">Supply</a><a href="/partners">Partners</a></nav>
        <div className={styles.foot}>Procurement V1</div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div><div className={styles.eyebrow}>SUPPLY · PROCUREMENT</div><h1>Turn supplier promises into controlled facts.</h1><p>Quotation, PO, supplier confirmation and receipt/commitment are explicit. Procurement never edits inventory balances or executes payments.</p></div>
        </header>
        {message ? <div className={styles.notice}>{message}</div> : null}
        <div className={styles.metrics}>{metrics.map(([status, count]) => <div key={status}><span>{status.replaceAll('_', ' ')}</span><b>{count}</b></div>)}</div>

        <section className={styles.twoCol}>
          <div className={styles.panel}>
            <div className={styles.panelHead}><span>SUPPLIER QUOTATIONS</span><h2>Sourcing evidence</h2></div>
            {data.quotations.map((quotation) => <article className={styles.docRow} key={quotation.id}><div><b>{quotation.quotation_number}</b><span>{quotation.supplier_name}</span><small>{quotation.currency.trim()} · {quotation.status}</small></div><div className={styles.actions}>{quotation.status === 'DRAFT' ? <><button onClick={() => void action(`/v1/procurement/quotations/${quotation.id}/status`, { status: 'ACCEPTED' })}>Accept</button><button onClick={() => void action(`/v1/procurement/quotations/${quotation.id}/status`, { status: 'REJECTED' })}>Reject</button></> : null}</div></article>)}
            {!data.quotations.length ? <p className={styles.empty}>No supplier quotations yet.</p> : null}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}><span>PURCHASE ORDERS</span><h2>Commercial commitments</h2></div>
            {data.purchaseOrders.map((po) => <article className={`${styles.docRow} ${selectedPo === po.id ? styles.selected : ''}`} key={po.id} onClick={() => setSelectedPo(po.id)}><div><b>{po.po_number}</b><span>{po.supplier_name}</span><small>{po.currency.trim()} {po.total_amount} · {po.status}</small></div><div className={styles.actions}>{po.status === 'DRAFT' ? <button onClick={(event) => { event.stopPropagation(); void action(`/v1/procurement/purchase-orders/${po.id}/issue`); }}>Issue PO</button> : null}<i>{data.snapshots.filter((snapshot) => snapshot.purchase_order_id === po.id).length} snapshots</i></div></article>)}
            {!data.purchaseOrders.length ? <p className={styles.empty}>No purchase orders yet.</p> : null}
          </div>
        </section>

        <section className={styles.forms}>
          <form onSubmit={(event) => void post(event, '/v1/procurement/quotations', (form) => ({ supplierPartnerId: form.get('supplierPartnerId'), supplierReference: form.get('supplierReference') || undefined, currency: form.get('currency'), validUntil: form.get('validUntil') || undefined, incoterm: form.get('incoterm') || undefined, paymentTerms: form.get('paymentTerms') || undefined, lines: [itemLine(form)] }))}>
            <span>NEW QUOTATION</span><h3>Record supplier quote</h3>
            <select name="supplierPartnerId" required defaultValue=""><option value="" disabled>Supplier / Factory</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partnerCode} · {partner.displayName}</option>)}</select>
            <div className={styles.inline}><input name="currency" defaultValue="EUR" maxLength={3} required /><input name="incoterm" placeholder="FCA / FOB" /></div>
            <input name="supplierReference" placeholder="Supplier quotation ref" /><input name="paymentTerms" placeholder="Payment terms" />
            <div className={styles.item}><select name="itemType" value={quoteItemType} onChange={(event) => setQuoteItemType(event.target.value as ItemType)}><option value="PART">PART</option><option value="SKU">SKU</option></select><select key={quoteItemType} name="itemId" required defaultValue=""><option value="" disabled>Item</option>{itemOptions(quoteItemType)}</select></div>
            <div className={styles.inline}><input name="quantity" inputMode="decimal" placeholder="Qty" required /><input name="unit" defaultValue="EA" /><input name="unitPrice" inputMode="decimal" placeholder="Unit price" required /></div>
            <input name="validUntil" type="date" /><button>Save quotation</button>
          </form>

          <form onSubmit={(event) => void post(event, '/v1/procurement/purchase-orders', (form) => ({ supplierPartnerId: form.get('supplierPartnerId'), sourceQuotationId: form.get('sourceQuotationId') || undefined, currency: form.get('currency'), incoterm: form.get('incoterm') || undefined, paymentTerms: form.get('paymentTerms') || undefined, depositTerms: form.get('depositTerms') || undefined, lines: [itemLine(form)] }))}>
            <span>NEW PURCHASE ORDER</span><h3>Create draft PO</h3>
            <select name="supplierPartnerId" required defaultValue=""><option value="" disabled>Supplier / Factory</option>{partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partnerCode} · {partner.displayName}</option>)}</select>
            <select name="sourceQuotationId" defaultValue=""><option value="">No source quotation</option>{data.quotations.filter((quotation) => quotation.status === 'ACCEPTED').map((quotation) => <option key={quotation.id} value={quotation.id}>{quotation.quotation_number} · {quotation.supplier_name}</option>)}</select>
            <div className={styles.inline}><input name="currency" defaultValue="EUR" maxLength={3} required /><input name="incoterm" placeholder="FCA / FOB" /></div>
            <input name="paymentTerms" placeholder="Payment terms" /><input name="depositTerms" placeholder="Deposit terms" />
            <div className={styles.item}><select name="itemType" value={poItemType} onChange={(event) => setPoItemType(event.target.value as ItemType)}><option value="PART">PART</option><option value="SKU">SKU</option></select><select key={poItemType} name="itemId" required defaultValue=""><option value="" disabled>Item</option>{itemOptions(poItemType)}</select></div>
            <div className={styles.inline}><input name="quantity" inputMode="decimal" placeholder="Qty" required /><input name="unit" defaultValue="EA" /><input name="unitPrice" inputMode="decimal" placeholder="Unit price" required /></div>
            <input name="requestedDate" type="date" /><button>Create draft PO</button>
          </form>
        </section>

        {selected ? <section className={styles.detail}>
          <div className={styles.detailHead}><div><span>SELECTED PO</span><h2>{selected.po_number} · {selected.supplier_name}</h2><p>{selected.status} · {selected.currency.trim()} {selected.total_amount}</p></div></div>
          <div className={styles.lineGrid}>{selectedLines.map((line) => <div key={line.id}><b>Line {line.line_no}</b><span>{line.part_number ?? line.sku}</span><small>{line.ordered_quantity} {line.unit} × {line.unit_price}</small></div>)}</div>
          <div className={styles.detailForms}>
            <form onSubmit={(event) => { const line = selectedLines[0]; if (!line) return; void post(event, `/v1/procurement/purchase-orders/${selected.id}/confirm`, (form) => ({ supplierReference: form.get('supplierReference') || undefined, note: form.get('note') || undefined, lines: [{ purchaseOrderLineId: line.id, confirmedQuantity: form.get('confirmedQuantity'), confirmedDate: form.get('confirmedDate') || undefined }] })); }}>
              <span>SUPPLIER CONFIRMATION</span><h3>Confirm first line</h3><input name="supplierReference" placeholder="Supplier confirmation ref" /><input name="confirmedQuantity" inputMode="decimal" defaultValue={selectedLines[0]?.ordered_quantity ?? ''} required /><input name="confirmedDate" type="date" /><input name="note" placeholder="Note" /><button disabled={selected.status !== 'ISSUED'}>Record confirmation</button>
            </form>
            <form onSubmit={(event) => { const line = selectedLines[0]; if (!line) return; void post(event, `/v1/procurement/purchase-orders/${selected.id}/receipts`, (form) => ({ kind: form.get('kind'), reference: form.get('reference') || undefined, occurredOn: form.get('occurredOn'), note: form.get('note') || undefined, lines: [{ purchaseOrderLineId: line.id, quantity: form.get('quantity'), unit: line.unit }] })); }}>
              <span>RECEIPT / COMMITMENT</span><h3>Record first line evidence</h3><select name="kind"><option>PHYSICAL_RECEIPT</option><option>FACTORY_COMMITMENT</option></select><input name="reference" placeholder="Receipt / commitment ref" /><input name="quantity" inputMode="decimal" placeholder="Quantity" required /><input name="occurredOn" type="date" required /><input name="note" placeholder="Note" /><button disabled={!['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(selected.status)}>Record evidence</button>
            </form>
          </div>
          <div className={styles.history}><span>IMMUTABLE STATE HISTORY</span>{data.snapshots.filter((snapshot) => snapshot.purchase_order_id === selected.id).map((snapshot) => <div key={snapshot.id}><b>{snapshot.state}</b><small>v{snapshot.po_version} · {new Date(snapshot.created_at).toLocaleString()}</small></div>)}</div>
        </section> : null}
      </section>
    </main>
  );
}
