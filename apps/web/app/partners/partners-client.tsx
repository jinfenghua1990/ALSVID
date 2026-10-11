'use client';

import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'SUPPLIER' | 'FACTORY' | 'DEALER' | 'CUSTOMER' | 'SERVICE_PARTNER' | 'LOGISTICS_PROVIDER';
type Partner = { id: string; partnerCode: string; kind: 'ORGANIZATION' | 'PERSON'; displayName: string; legalName: string | null; status: string; countryCode: string | null; version: number; roles: Role[] };
type PartnerDetail = Partner & {
  identifiers: Array<{ id: string; scheme: string; value: string }>;
  contacts: Array<{ id: string; type: string; purpose: string; value: string; isPrimary: boolean }>;
  addresses: Array<{ id: string; purpose: string; recipient: string | null; line1: string; line2: string | null; city: string; region: string | null; postalCode: string | null; countryCode: string }>;
};
const allRoles: Role[] = ['SUPPLIER', 'FACTORY', 'DEALER', 'CUSTOMER', 'SERVICE_PARTNER', 'LOGISTICS_PROVIDER'];

export default function PartnersClient() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selected, setSelected] = useState<PartnerDetail | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(path, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('Session expired');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? 'Request failed');
    return payload.data;
  }

  async function load(search = '') {
    try {
      setPartners(await api(`/api/partners?q=${encodeURIComponent(search)}`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load Partners');
    }
  }

  useEffect(() => { void load(); }, []);
  const counts = useMemo(() => allRoles.map((role) => [role, partners.filter((partner) => partner.roles.includes(role)).length] as const), [partners]);

  async function openPartner(id: string) {
    setMessage('');
    try { setSelected(await api(`/api/partners/${id}`)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load Partner'); }
  }

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roles = allRoles.filter((role) => form.get(role) === 'on');
    const identifierValue = String(form.get('identifierValue') ?? '').trim();
    const primaryEmail = String(form.get('primaryEmail') ?? '').trim();
    const addressLine1 = String(form.get('addressLine1') ?? '').trim();
    const addressCity = String(form.get('addressCity') ?? '').trim();
    const addressCountry = String(form.get('addressCountry') ?? '').trim();

    try {
      const created = await api('/api/partners', {
        method: 'POST',
        body: JSON.stringify({
          kind: form.get('kind'),
          displayName: form.get('displayName'),
          legalName: form.get('legalName') || undefined,
          countryCode: form.get('countryCode') || undefined,
          roles,
          identifiers: identifierValue ? [{ scheme: form.get('identifierScheme') || 'REGISTRATION', value: identifierValue }] : [],
          contacts: primaryEmail ? [{ type: 'EMAIL', purpose: 'GENERAL', value: primaryEmail, isPrimary: true }] : [],
          addresses: addressLine1 && addressCity && addressCountry ? [{ purpose: 'REGISTERED', line1: addressLine1, city: addressCity, postalCode: form.get('addressPostalCode') || undefined, countryCode: addressCountry }] : [],
        }),
      });
      setCreateOpen(false);
      await load(query);
      setSelected(created);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create Partner'); }
  }

  async function savePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const roles = allRoles.filter((role) => form.get(role) === 'on');
    try {
      const updated = await api(`/api/partners/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          expectedVersion: selected.version,
          displayName: form.get('displayName'),
          legalName: form.get('legalName') ?? '',
          countryCode: form.get('countryCode') ?? '',
          status: form.get('status'),
          roles,
        }),
      });
      setSelected(updated);
      await load(query);
      setMessage('Partner saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save Partner'); }
  }

  return (
    <AppShell navigation={navigationFor('/partners')} footer="ALSVID · 内部管理">
      
      <section className="partnerWorkspace">
        <header className="partnerHeader">
          <div><div className="eyebrow">PARTNER MASTER</div><h1 className="sectionTitle">One identity. Many roles.</h1><p className="sectionLead">Suppliers, factories, dealers, customers and service partners share one durable business identity.</p></div>
          <button className="primaryButton" onClick={() => setCreateOpen(true)}>New Partner</button>
        </header>

        <div className="metricRow">{counts.map(([role, count]) => <div className="metric" key={role}><span>{role.replaceAll('_', ' ')}</span><b>{count}</b></div>)}</div>
        <div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(query); }} placeholder="Search name or Partner code" /><button onClick={() => void load(query)}>Search</button></div>
        {message ? <div className="notice">{message}</div> : null}

        <div className="partnerGrid">
          <div className="tableCard">
            <div className="tableHead"><span>Partner</span><span>Roles</span><span>Status</span></div>
            {partners.map((partner) => <button className="tableRow" key={partner.id} onClick={() => void openPartner(partner.id)}><span><b>{partner.displayName}</b><small>{partner.partnerCode} · {partner.countryCode ?? '—'}</small></span><span className="roleList">{partner.roles.length ? partner.roles.map((role) => <i key={role}>{role.replaceAll('_', ' ')}</i>) : <small>No role</small>}</span><span>{partner.status}</span></button>)}
            {!partners.length ? <div className="emptyState">No Partners yet. Create the first business identity.</div> : null}
          </div>

          <aside className="detailCard">
            {selected ? <form className="stack" onSubmit={savePartner}>
              <div><div className="eyebrow">{selected.partnerCode}</div><h2>{selected.displayName}</h2></div>
              <label>Display name<input name="displayName" defaultValue={selected.displayName} required /></label>
              <label>Legal name<input name="legalName" defaultValue={selected.legalName ?? ''} /></label>
              <div className="split"><label>Country<input name="countryCode" maxLength={2} defaultValue={selected.countryCode ?? ''} /></label><label>Status<select name="status" defaultValue={selected.status}><option>ACTIVE</option><option>INACTIVE</option></select></label></div>
              <fieldset><legend>Roles</legend><div className="checkGrid">{allRoles.map((role) => <label key={role}><input type="checkbox" name={role} defaultChecked={selected.roles.includes(role)} />{role.replaceAll('_', ' ')}</label>)}</div></fieldset>
              <section className="factBlock"><span>Identifiers</span>{selected.identifiers.length ? selected.identifiers.map((item) => <p key={item.id}><b>{item.scheme}</b>{item.value}</p>) : <small>None recorded</small>}</section>
              <section className="factBlock"><span>Contacts</span>{selected.contacts.length ? selected.contacts.map((item) => <p key={item.id}><b>{item.purpose} · {item.type}</b>{item.value}</p>) : <small>None recorded</small>}</section>
              <section className="factBlock"><span>Addresses</span>{selected.addresses.length ? selected.addresses.map((item) => <p key={item.id}><b>{item.purpose}</b>{[item.line1, item.city, item.postalCode, item.countryCode].filter(Boolean).join(', ')}</p>) : <small>None recorded</small>}</section>
              <button className="primaryButton">Save changes</button>
            </form> : <div className="emptyState">Select a Partner to inspect and edit its master identity.</div>}
          </aside>
        </div>
      </section>

      {createOpen ? <div className="modalBackdrop" onMouseDown={() => setCreateOpen(false)}><form className="modalCard stack" onSubmit={createPartner} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalHead"><div><div className="eyebrow">NEW MASTER IDENTITY</div><h2>Create Partner</h2></div><button type="button" onClick={() => setCreateOpen(false)}>×</button></div>
        <label>Type<select name="kind"><option value="ORGANIZATION">Organization</option><option value="PERSON">Person</option></select></label>
        <label>Display name<input name="displayName" required /></label>
        <label>Legal name<input name="legalName" /></label>
        <div className="split"><label>Country code<input name="countryCode" maxLength={2} placeholder="DE" /></label><label>Primary email<input name="primaryEmail" type="email" /></label></div>
        <div className="split"><label>Identifier scheme<input name="identifierScheme" placeholder="VAT / EORI / REGISTRATION" /></label><label>Identifier value<input name="identifierValue" /></label></div>
        <fieldset><legend>Registered address</legend><div className="stack"><label>Address line<input name="addressLine1" /></label><div className="split"><label>City<input name="addressCity" /></label><label>Postal code<input name="addressPostalCode" /></label></div><label>Country code<input name="addressCountry" maxLength={2} placeholder="DE" /></label></div></fieldset>
        <fieldset><legend>Business roles</legend><div className="checkGrid">{allRoles.map((role) => <label key={role}><input type="checkbox" name={role} />{role.replaceAll('_', ' ')}</label>)}</div></fieldset>
        <button className="primaryButton">Create Partner</button>
      </form></div> : null}
    </AppShell>
  );
}
