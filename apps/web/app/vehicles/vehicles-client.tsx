'use client';

import { AppShell } from '@alsvid/ui';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { navigationFor } from '../app-navigation';
import styles from './vehicles.module.css';

type Partner = { id:string; partnerCode:string; displayName:string; roles:string[] };
type VehicleRow = { id:string; vehicle_code:string; frame_number:string; sku:string; lifecycle_state?:string; owner_partner_id?:string|null; owner_name?:string|null; dealer_name?:string|null; handover_number?:string|null; born_at:string };
type Vehicle360 = { vehicle:any; lifecycle:any[]; ownership:any[]; handovers:any[]; production:{qc:any[];deviations:any[]}; logistics:any[]; inventory:any[] };

function dateTimeInput(value?: string | null): string {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function VehiclesClient() {
  const router = useRouter();
  const [vehicles,setVehicles]=useState<VehicleRow[]>([]);
  const [partners,setPartners]=useState<Partner[]>([]);
  const [selectedId,setSelectedId]=useState<string>('');
  const [detail,setDetail]=useState<Vehicle360|null>(null);
  const [garage,setGarage]=useState<any[]>([]);
  const [message,setMessage]=useState('');

  async function api(path:string,init?:RequestInit){
    const headers=new Headers(init?.headers);if(init?.body)headers.set('content-type','application/json');
    const response=await fetch(`/api/control${path}`,{...init,headers});
    if(response.status===401){router.push('/login');throw new Error('Session expired');}
    const payload=await response.json();if(!response.ok)throw new Error(payload?.message??'Request failed');return payload.data;
  }

  async function load(){
    try{
      const [vehicleRows,partnerRows]=await Promise.all([api('/v1/vehicles'),api('/v1/partners')]);
      setVehicles(vehicleRows);setPartners(partnerRows);
      if(selectedId) await loadDetail(selectedId);
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Vehicle Center');}
  }

  async function loadDetail(id:string){
    setSelectedId(id);setDetail(await api(`/v1/vehicles/${id}/360`));
  }

  useEffect(()=>{void load();},[]);

  const dealers=useMemo(()=>partners.filter((p)=>p.roles.includes('DEALER')), [partners]);
  const customers=useMemo(()=>partners.filter((p)=>p.roles.includes('CUSTOMER')), [partners]);
  const owned=vehicles.filter((v)=>Boolean(v.owner_partner_id)).length;
  const handed=vehicles.filter((v)=>Boolean(v.handover_number)).length;
  const unowned=vehicles.length-owned;

  async function search(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);const reference=String(form.get('reference')??'').trim();if(!reference)return;
    try{const found=await api(`/v1/vehicles/lookup/${encodeURIComponent(reference)}`);await loadDetail(found.id);setMessage(`Found ${found.vehicle_code} · ${found.frame_number}`);}catch(error){setMessage(error instanceof Error?error.message:'Vehicle not found');}
  }

  async function garagePreview(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);const partnerId=String(form.get('partnerId')??'');if(!partnerId)return;
    try{setGarage(await api(`/v1/vehicles/garage/${partnerId}`));setMessage('My ALSVID garage preview loaded.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to load garage');}
  }

  async function action(path:string,body:unknown){
    try{await api(path,{method:'POST',body:JSON.stringify(body)});setMessage('Vehicle evidence updated.');await load();if(selectedId)await loadDetail(selectedId);}catch(error){setMessage(error instanceof Error?error.message:'Unable to update Vehicle');}
  }

  async function handover(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selectedId)return;const form=new FormData(event.currentTarget);const value=String(form.get('handedOverAt')??'');
    await action(`/v1/vehicles/${selectedId}/handover`,{dealerPartnerId:form.get('dealerPartnerId'),customerPartnerId:form.get('customerPartnerId'),handedOverAt:new Date(value).toISOString(),reference:form.get('reference'),note:form.get('note'),evidence:{source:'ALSVID_ADMIN'}});
  }

  async function transfer(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selectedId||!detail?.vehicle.owner_partner_id)return;const form=new FormData(event.currentTarget);const value=String(form.get('occurredAt')??'');
    await action(`/v1/vehicles/${selectedId}/ownership/transfer`,{expectedCurrentOwnerPartnerId:detail.vehicle.owner_partner_id,newOwnerPartnerId:form.get('newOwnerPartnerId'),occurredAt:new Date(value).toISOString(),reason:form.get('reason')});
  }

  async function release(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selectedId||!detail?.vehicle.owner_partner_id)return;const form=new FormData(event.currentTarget);const value=String(form.get('occurredAt')??'');
    await action(`/v1/vehicles/${selectedId}/ownership/release`,{expectedCurrentOwnerPartnerId:detail.vehicle.owner_partner_id,occurredAt:new Date(value).toISOString(),reason:form.get('reason')});
  }

  return <AppShell navigation={navigationFor('/vehicles')} footer="Vehicle identity · ownership · lifetime evidence" classNames={{workspace:`workspace ${styles.workspace}`}}>
    <header className={styles.header}><div className={styles.eyebrow}>VEHICLE CENTER · 360</div><h1>One bicycle, one immutable identity, one lifetime timeline.</h1><p>Vehicle 360 reads Product, Production, QC, Inventory and Logistics facts, while Vehicle owns only frame identity, handover and ownership history.</p></header>
    {message?<div className={styles.notice}>{message}</div>:null}

    <div className={styles.toolbar}>
      <form className={styles.search} onSubmit={search}><input name="reference" placeholder="Frame number or Vehicle Code"/><button>Find Vehicle</button></form>
      <form className={styles.garagePicker} onSubmit={garagePreview}><select name="partnerId" defaultValue=""><option value="" disabled>Customer · My ALSVID preview</option>{customers.map((p)=><option key={p.id} value={p.id}>{p.partnerCode} · {p.displayName}</option>)}</select><button>Garage</button></form>
    </div>

    <div className={styles.metrics}><div><span>VEHICLES</span><b>{vehicles.length}</b></div><div><span>CURRENTLY OWNED</span><b>{owned}</b></div><div><span>HANDED OVER</span><b>{handed}</b></div><div><span>UNOWNED / PRE-HANDOVER</span><b>{unowned}</b></div></div>

    {garage.length?<section className={`${styles.panel} ${styles.garage}`}><div className={styles.sectionHead}><div><span className={styles.label}>MY ALSVID PREVIEW</span><h2>Current garage</h2></div><p>Only current ownership is shown; historical owners remain in Vehicle evidence.</p></div><div className={styles.garageGrid}>{garage.map((item)=><button className={`${styles.garageItem} ${styles.secondary}`} key={item.id} onClick={()=>void loadDetail(item.id)}><b>{item.model_code} · {item.frame_number}</b><small>{item.vehicle_code} · owned since {displayDate(item.owned_since)}</small></button>)}</div></section>:null}

    <div className={styles.layout}>
      <section className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>REGISTRY</span><h2>Vehicles</h2></div><p>Frame identity is immutable.</p></div><div className={styles.vehicleList}>{vehicles.map((v)=><div className={`${styles.vehicleRow} ${selectedId===v.id?styles.selected:''}`} key={v.id}><span><b>{v.frame_number}</b><br/><small>{v.vehicle_code} · {v.sku}</small><br/><i className={styles.badge}>{v.lifecycle_state??'BORN'}</i>{v.owner_name?<small>{v.owner_name}</small>:<small>No current owner</small>}</span><button onClick={()=>void loadDetail(v.id)}>360</button></div>)}{!vehicles.length?<p className={styles.empty}>No Vehicles born yet.</p>:null}</div></section>

      <section className={styles.detail}>{detail?<>
        <div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>IDENTITY</span><h2>{detail.vehicle.frame_number}</h2></div><i className={styles.badge}>{detail.vehicle.lifecycle_state}</i></div><div className={styles.identity}><div className={styles.fact}><span>Vehicle Code</span><b>{detail.vehicle.vehicle_code}</b></div><div className={styles.fact}><span>Platform / Model</span><b>{detail.vehicle.platform_code} · {detail.vehicle.model_code}</b></div><div className={styles.fact}><span>SKU</span><b>{detail.vehicle.sku}</b></div><div className={styles.fact}><span>Build Spec</span><b>{detail.vehicle.build_spec_code}</b></div><div className={styles.fact}><span>Factory</span><b>{detail.vehicle.factory_name}</b></div><div className={styles.fact}><span>Birth QC</span><b>{detail.vehicle.birth_qc_result} · {detail.vehicle.birth_qc_checklist??'—'}</b></div><div className={styles.fact}><span>Current Owner</span><b>{detail.vehicle.owner_name??'Not owned'}</b></div><div className={styles.fact}><span>Current Location</span><b>{detail.vehicle.current_warehouse_name??detail.vehicle.shipment_status??'No inventory/logistics fact'}</b></div></div></div>

        <div className={styles.two}><div className={styles.panel}><span className={styles.label}>HANDOVER</span><h2>{detail.handovers.length?'Handover evidence':'Record first customer handover'}</h2>{detail.handovers.length?<div className={styles.timeline}>{detail.handovers.map((h)=><div className={styles.event} key={h.id}><time>{displayDate(h.handed_over_at)}</time><span><b>{h.handover_number}</b>{h.dealer_name} → {h.customer_name}<br/><span className={styles.muted}>{h.reference??'No reference'}</span></span></div>)}</div>:<form className={styles.form} onSubmit={handover}><select name="dealerPartnerId" required defaultValue=""><option value="" disabled>Dealer</option>{dealers.map((p)=><option key={p.id} value={p.id}>{p.partnerCode} · {p.displayName}</option>)}</select><select name="customerPartnerId" required defaultValue=""><option value="" disabled>Customer</option>{customers.map((p)=><option key={p.id} value={p.id}>{p.partnerCode} · {p.displayName}</option>)}</select><input name="handedOverAt" type="datetime-local" defaultValue={dateTimeInput()} required/><input name="reference" placeholder="Handover / delivery reference"/><input name="note" placeholder="Evidence note"/><button>Record handover</button></form>}</div>

        <div className={styles.panel}><span className={styles.label}>OWNERSHIP</span><h2>{detail.vehicle.owner_name??'No current owner'}</h2>{detail.vehicle.owner_partner_id?<div className={styles.form}><form className={styles.form} onSubmit={transfer}><select name="newOwnerPartnerId" required defaultValue=""><option value="" disabled>Transfer to customer</option>{customers.filter((p)=>p.id!==detail.vehicle.owner_partner_id).map((p)=><option key={p.id} value={p.id}>{p.partnerCode} · {p.displayName}</option>)}</select><input name="occurredAt" type="datetime-local" defaultValue={dateTimeInput()} required/><input name="reason" placeholder="Transfer reason" defaultValue="Ownership transfer"/><button>Transfer ownership</button></form><form className={styles.form} onSubmit={release}><input name="occurredAt" type="datetime-local" defaultValue={dateTimeInput()} required/><input name="reason" placeholder="Release reason" required/><button className={styles.danger}>Release current ownership</button></form></div>:<p className={styles.muted}>Initial ownership is created only through dealer → customer handover.</p>}</div></div>

        <div className={styles.two}><div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>LIFECYCLE</span><h2>Vehicle timeline</h2></div></div><div className={styles.timeline}>{detail.lifecycle.map((e)=><div className={styles.event} key={e.id}><time>{displayDate(e.occurred_at)}</time><span><b>{e.state} · {e.event_type}</b><span className={styles.muted}>{e.note||e.source_type}</span></span></div>)}</div></div><div className={styles.panel}><div className={styles.sectionHead}><div><span className={styles.label}>OWNERSHIP HISTORY</span><h2>Append-only chain</h2></div></div><div className={styles.timeline}>{detail.ownership.map((e)=><div className={styles.event} key={e.id}><time>{displayDate(e.occurred_at)}</time><span><b>{e.event_type} · {e.owner_name}</b><span className={styles.muted}>{e.counterparty_name?`Counterparty: ${e.counterparty_name}`:e.reason}</span></span></div>)}{!detail.ownership.length?<p className={styles.empty}>No ownership evidence yet.</p>:null}</div></div></div>

        <div className={styles.two}><div className={styles.panel}><span className={styles.label}>LOGISTICS</span><h2>Shipment history</h2><div className={styles.timeline}>{detail.logistics.map((e,index)=><div className={styles.event} key={`${e.shipment_id}-${e.event_type??'shipment'}-${index}`}><time>{displayDate(e.occurred_at)}</time><span><b>{e.shipment_number} · {e.event_type??e.shipment_status}</b><span className={styles.muted}>{e.location_text??e.route_type}</span></span></div>)}{!detail.logistics.length?<p className={styles.empty}>No shipment history.</p>:null}</div></div><div className={styles.panel}><span className={styles.label}>INVENTORY</span><h2>Physical movement history</h2><div className={styles.timeline}>{detail.inventory.map((e)=><div className={styles.event} key={e.id}><time>{displayDate(e.occurred_at)}</time><span><b>{e.movement_number} · {e.movement_type}</b><span className={styles.muted}>{e.source_warehouse_code??'Outside'} → {e.destination_warehouse_code??'Outside'}</span></span></div>)}{!detail.inventory.length?<p className={styles.empty}>No Vehicle inventory movement.</p>:null}</div></div></div>
      </>:<div className={styles.panel}><span className={styles.label}>VEHICLE 360</span><h2>Select a Vehicle.</h2><p className={styles.muted}>Search by frame number / Vehicle Code or choose a Vehicle from the registry.</p></div>}</section>
    </div>
  </AppShell>;
}
