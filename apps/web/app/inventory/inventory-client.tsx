'use client';

import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './inventory.module.css';

type ItemKind='PART'|'SKU'|'VEHICLE';
type Warehouse={id:string;code:string;name:string;country_code:string;timezone:string;partner_name:string|null;active:boolean};
type Location={id:string;warehouse_id:string;warehouse_code:string;warehouse_name:string;code:string;name:string;location_type:string;active:boolean};
type Part={id:string;part_number:string;name:string;default_unit:string};
type Sku={id:string;sku:string;name:string};
type Vehicle={id:string;vehicle_code:string;frame_number:string;sku:string};
type Balance={item_kind:ItemKind;part_id:string|null;sku_id:string|null;vehicle_id:string|null;warehouse_code:string;warehouse_name:string;location_code:string;location_name:string;unit:string;on_hand:string;reserved:string;available:string;part_number:string|null;part_name:string|null;sku:string|null;sku_name:string|null;frame_number:string|null};
type Movement={id:string;movement_number:string;movement_type:string;item_kind:ItemKind;part_number:string|null;sku:string|null;frame_number:string|null;quantity:string;unit:string;source_warehouse_code:string|null;source_location_code:string|null;destination_warehouse_code:string|null;destination_location_code:string|null;reason:string;occurred_at:string};
type Reservation={id:string;item_kind:ItemKind;part_number:string|null;sku:string|null;frame_number:string|null;warehouse_code:string;location_code:string;quantity:string;unit:string;status:string;reference_type:string|null;created_at:string};
type Stocktake={id:string;stocktake_number:string;warehouse_id:string;warehouse_code:string;warehouse_name:string;status:string;note:string;opened_at:string;closed_at:string|null};
type Count={id:string;session_id:string;location_id:string;location_code:string;item_kind:ItemKind;part_number:string|null;sku:string|null;frame_number:string|null;counted_quantity:string;unit:string;counted_at:string};
type InventorySummary={balances:Balance[];movements:Movement[];reservations:Reservation[]};
type WarehouseSummary={warehouses:Warehouse[];locations:Location[];stocktakes:Stocktake[];counts:Count[]};

const emptyInventory:InventorySummary={balances:[],movements:[],reservations:[]};
const emptyWarehouse:WarehouseSummary={warehouses:[],locations:[],stocktakes:[],counts:[]};

export default function InventoryClient(){
  const router=useRouter();
  const [inventory,setInventory]=useState<InventorySummary>(emptyInventory);
  const [warehouse,setWarehouse]=useState<WarehouseSummary>(emptyWarehouse);
  const [parts,setParts]=useState<Part[]>([]);
  const [skus,setSkus]=useState<Sku[]>([]);
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [movementKind,setMovementKind]=useState<ItemKind>('PART');
  const [reservationKind,setReservationKind]=useState<ItemKind>('PART');
  const [countKind,setCountKind]=useState<ItemKind>('PART');
  const [adjustKind,setAdjustKind]=useState<ItemKind>('PART');
  const [movementType,setMovementType]=useState('RECEIPT');
  const [selectedStocktakeId,setSelectedStocktakeId]=useState('');
  const [message,setMessage]=useState('');

  async function api(path:string,init?:RequestInit){
    const headers=new Headers(init?.headers);headers.set('content-type','application/json');
    const response=await fetch(`/api/control${path}`,{...init,headers});
    if(response.status===401){router.push('/login');throw new Error('Session expired');}
    const payload=await response.json();if(!response.ok)throw new Error(payload?.message??'Request failed');return payload.data;
  }

  async function reload(){
    try{
      const [inv,wh,engineering,product,vehicleRows]=await Promise.all([api('/v1/inventory'),api('/v1/warehouse'),api('/v1/engineering'),api('/v1/product'),api('/v1/vehicles')]);
      setInventory(inv);setWarehouse(wh);setParts(engineering.parts);setSkus(product.skus);setVehicles(vehicleRows);
      if(!selectedStocktakeId){const open=wh.stocktakes.find((item:Stocktake)=>item.status==='OPEN');if(open)setSelectedStocktakeId(open.id);}
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Inventory workspace');}
  }
  useEffect(()=>{void reload();},[]);

  function items(kind:ItemKind){
    if(kind==='PART')return parts.map(item=>({id:item.id,label:`${item.part_number} · ${item.name}`,unit:item.default_unit}));
    if(kind==='SKU')return skus.map(item=>({id:item.id,label:`${item.sku} · ${item.name}`,unit:'EA'}));
    return vehicles.map(item=>({id:item.id,label:`${item.frame_number} · ${item.sku}`,unit:'EA'}));
  }
  function unitFor(kind:ItemKind,itemId:string){return items(kind).find(item=>item.id===itemId)?.unit??'EA';}
  function label(balance:Balance){return balance.part_number??balance.sku??balance.frame_number??'Unknown';}
  function movementLabel(row:Movement){return row.part_number??row.sku??row.frame_number??'Unknown';}
  const activeReservations=inventory.reservations.filter(item=>item.status==='ACTIVE');
  const selectedStocktake=warehouse.stocktakes.find(item=>item.id===selectedStocktakeId)??null;
  const stocktakeCounts=selectedStocktake?warehouse.counts.filter(item=>item.session_id===selectedStocktake.id):[];
  const metrics=useMemo(()=>({warehouses:warehouse.warehouses.length,locations:warehouse.locations.length,stockPositions:inventory.balances.length,activeReservations:inventory.reservations.filter(row=>row.status==='ACTIVE').length,openStocktakes:warehouse.stocktakes.filter(row=>row.status==='OPEN').length}),[inventory.balances,inventory.reservations,warehouse]);

  async function action(path:string,body:unknown={}){try{await api(path,{method:'POST',body:JSON.stringify(body)});setMessage('Updated.');await reload();}catch(error){setMessage(error instanceof Error?error.message:'Unable to update');}}
  async function submit(event:FormEvent<HTMLFormElement>,path:string,build:(form:FormData)=>unknown){event.preventDefault();const formElement=event.currentTarget;const form=new FormData(formElement);try{await api(path,{method:'POST',body:JSON.stringify(build(form))});setMessage('Saved.');formElement.reset();await reload();}catch(error){setMessage(error instanceof Error?error.message:'Unable to save');}}

  return <AppShell navigation={navigationFor('/inventory')} footer="ALSVID · 内部管理">
    
    <section>
      <header className={styles.header}><div><div className={styles.eyebrow}>INVENTORY CONTROL</div><h1>Stock is a history, not an editable number.</h1><p>Every receipt, transfer, issue, adjustment and stocktake correction is append-only. On-hand and available stock are always derived from the ledger plus active reservations.</p></div></header>
      {message?<div className={styles.notice}>{message}</div>:null}
      <div className={styles.metrics}><div><span>WAREHOUSES</span><b>{metrics.warehouses}</b></div><div><span>LOCATIONS</span><b>{metrics.locations}</b></div><div><span>STOCK POSITIONS</span><b>{metrics.stockPositions}</b></div><div><span>ACTIVE RESERVATIONS</span><b>{metrics.activeReservations}</b></div><div><span>OPEN STOCKTAKES</span><b>{metrics.openStocktakes}</b></div></div>

      <section className={styles.topGrid}>
        <form className={styles.card} onSubmit={(event)=>void submit(event,'/v1/warehouse/warehouses',(form)=>({code:form.get('code'),name:form.get('name'),countryCode:form.get('countryCode'),timezone:form.get('timezone')}))}><span>WAREHOUSE MASTER</span><h2>Create warehouse</h2><div className={styles.inline}><input name="code" placeholder="DE-BERLIN" required/><input name="name" placeholder="Germany Warehouse" required/></div><div className={styles.inline}><input name="countryCode" defaultValue="DE" maxLength={2} required/><input name="timezone" defaultValue="Europe/Berlin" required/></div><button>Create warehouse</button></form>
        <form className={styles.card} onSubmit={(event)=>void submit(event,'/v1/warehouse/locations',(form)=>({warehouseId:form.get('warehouseId'),code:form.get('code'),name:form.get('name'),locationType:form.get('locationType')}))}><span>WAREHOUSE LOCATION</span><h2>Create bin / staging area</h2><select name="warehouseId" required defaultValue=""><option value="" disabled>Warehouse</option>{warehouse.warehouses.map(item=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><div className={styles.inline}><input name="code" placeholder="A01-01" required/><input name="name" placeholder="Storage A01-01" required/></div><select name="locationType"><option>STORAGE</option><option>RECEIVING</option><option>STAGING</option><option>PICK</option><option>QUARANTINE</option><option>DISPATCH</option></select><button>Create location</button></form>
      </section>

      <section className={styles.opsGrid}>
        <form className={styles.card} onSubmit={(event)=>void submit(event,'/v1/inventory/movements',(form)=>{const kind=form.get('itemKind') as ItemKind;const itemId=String(form.get('itemId'));return{movementType:form.get('movementType'),itemKind:kind,itemId,unit:unitFor(kind,itemId),quantity:form.get('quantity'),sourceLocationId:form.get('sourceLocationId')||undefined,destinationLocationId:form.get('destinationLocationId')||undefined,reason:form.get('reason')||undefined,idempotencyKey:crypto.randomUUID()};})}><span>NORMAL MOVEMENT</span><h2>Receipt · Transfer · Issue · Return</h2><select name="movementType" value={movementType} onChange={event=>setMovementType(event.target.value)}><option>RECEIPT</option><option>TRANSFER</option><option>ISSUE</option><option>RETURN</option></select><select name="itemKind" value={movementKind} onChange={event=>setMovementKind(event.target.value as ItemKind)}><option>PART</option><option>SKU</option><option>VEHICLE</option></select><select name="itemId" required defaultValue=""><option value="" disabled>Inventory item</option>{items(movementKind).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><input name="quantity" inputMode="decimal" defaultValue={movementKind==='VEHICLE'?'1':''} placeholder="Quantity" required/><div className={styles.inline}><select name="sourceLocationId" defaultValue=""><option value="">No source</option>{warehouse.locations.map(item=><option key={item.id} value={item.id}>{item.warehouse_code}/{item.code}</option>)}</select><select name="destinationLocationId" defaultValue=""><option value="">No destination</option>{warehouse.locations.map(item=><option key={item.id} value={item.id}>{item.warehouse_code}/{item.code}</option>)}</select></div><input name="reason" placeholder={`${movementType} reason / reference`}/><button>Post immutable movement</button></form>

        <form className={styles.card} onSubmit={(event)=>void submit(event,'/v1/inventory/reservations',(form)=>{const kind=form.get('itemKind') as ItemKind;const itemId=String(form.get('itemId'));return{itemKind:kind,itemId,unit:unitFor(kind,itemId),locationId:form.get('locationId'),quantity:form.get('quantity'),referenceType:form.get('referenceType')||undefined,note:form.get('note')||undefined};})}><span>RESERVATION</span><h2>Protect stock for demand</h2><select name="itemKind" value={reservationKind} onChange={event=>setReservationKind(event.target.value as ItemKind)}><option>PART</option><option>SKU</option><option>VEHICLE</option></select><select name="itemId" required defaultValue=""><option value="" disabled>Inventory item</option>{items(reservationKind).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><select name="locationId" required defaultValue=""><option value="" disabled>Reserve from location</option>{warehouse.locations.map(item=><option key={item.id} value={item.id}>{item.warehouse_code}/{item.code}</option>)}</select><input name="quantity" inputMode="decimal" defaultValue={reservationKind==='VEHICLE'?'1':''} placeholder="Quantity" required/><input name="referenceType" placeholder="DEALER_ORDER / SHIPMENT / COMMERCE"/><input name="note" placeholder="Reservation note"/><button>Create reservation</button></form>

        <form className={styles.card} onSubmit={(event)=>void submit(event,'/v1/inventory/movements',(form)=>{const kind=form.get('itemKind') as ItemKind;const itemId=String(form.get('itemId'));const direction=String(form.get('direction'));const locationId=String(form.get('locationId'));return{movementType:'ADJUSTMENT',itemKind:kind,itemId,unit:unitFor(kind,itemId),quantity:form.get('quantity'),sourceLocationId:direction==='OUT'?locationId:undefined,destinationLocationId:direction==='IN'?locationId:undefined,reason:form.get('reason'),idempotencyKey:crypto.randomUUID()};})}><span>CONTROLLED ADJUSTMENT</span><h2>Privileged correction</h2><select name="direction"><option value="IN">INCREASE</option><option value="OUT">DECREASE</option></select><select name="itemKind" value={adjustKind} onChange={event=>setAdjustKind(event.target.value as ItemKind)}><option>PART</option><option>SKU</option><option>VEHICLE</option></select><select name="itemId" required defaultValue=""><option value="" disabled>Inventory item</option>{items(adjustKind).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><select name="locationId" required defaultValue=""><option value="" disabled>Location</option>{warehouse.locations.map(item=><option key={item.id} value={item.id}>{item.warehouse_code}/{item.code}</option>)}</select><input name="quantity" inputMode="decimal" placeholder="Quantity" required/><input name="reason" placeholder="Adjustment reason is mandatory operational evidence" required/><button>Post adjustment</button></form>
      </section>

      <section className={styles.twoCol}>
        <div className={styles.panel}><div className={styles.sectionHead}><span>AVAILABLE STOCK</span><h2>Derived location balances</h2></div><div className={styles.tableWrap}><table><thead><tr><th>Item</th><th>Type</th><th>Warehouse / Location</th><th>On hand</th><th>Reserved</th><th>Available</th></tr></thead><tbody>{inventory.balances.map((row,index)=><tr key={`${row.item_kind}-${row.part_id??row.sku_id??row.vehicle_id}-${row.location_code}-${index}`}><td><b>{label(row)}</b></td><td>{row.item_kind}</td><td>{row.warehouse_code}/{row.location_code}</td><td>{row.on_hand} {row.unit}</td><td>{row.reserved}</td><td><b>{row.available}</b></td></tr>)}</tbody></table>{!inventory.balances.length?<p className={styles.empty}>No stock has been posted yet.</p>:null}</div></div>
        <div className={styles.panel}><div className={styles.sectionHead}><span>ACTIVE RESERVATIONS</span><h2>Protected demand</h2></div>{activeReservations.map(row=><article className={styles.row} key={row.id}><div><b>{row.part_number??row.sku??row.frame_number}</b><span>{row.warehouse_code}/{row.location_code} · {row.quantity} {row.unit}</span><small>{row.reference_type??'No external reference'}</small></div><div className={styles.rowActions}><button onClick={()=>void action(`/v1/inventory/reservations/${row.id}/issue`,{idempotencyKey:crypto.randomUUID(),reason:'Reserved stock issue'})}>Issue</button><button className={styles.secondary} onClick={()=>void action(`/v1/inventory/reservations/${row.id}/release`)}>Release</button></div></article>)}{!activeReservations.length?<p className={styles.empty}>No active reservations.</p>:null}</div>
      </section>

      <section className={styles.stocktakePanel}>
        <div className={styles.sectionHead}><span>STOCKTAKE</span><h2>Count evidence → correction movements</h2><p>Counts never overwrite stock. Closing a session compares the latest count with the movement ledger and posts only the required compensating movement.</p></div>
        <div className={styles.stocktakeGrid}>
          <form className={styles.card} onSubmit={(event)=>void submit(event,'/v1/warehouse/stocktakes',(form)=>({warehouseId:form.get('warehouseId'),note:form.get('note')||undefined}))}><span>OPEN SESSION</span><select name="warehouseId" required defaultValue=""><option value="" disabled>Warehouse</option>{warehouse.warehouses.map(item=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><input name="note" placeholder="Cycle count / annual stocktake"/><button>Open stocktake</button></form>
          <div className={styles.stocktakeList}>{warehouse.stocktakes.map(item=><button key={item.id} className={selectedStocktakeId===item.id?styles.selected:''} onClick={()=>setSelectedStocktakeId(item.id)}><b>{item.stocktake_number}</b><span>{item.warehouse_code} · {item.status}</span><small>{new Date(item.opened_at).toLocaleString()}</small></button>)}</div>
          {selectedStocktake?<form className={styles.card} onSubmit={(event)=>void submit(event,`/v1/warehouse/stocktakes/${selectedStocktake.id}/counts`,(form)=>{const kind=form.get('itemKind') as ItemKind;const itemId=String(form.get('itemId'));return{locationId:form.get('locationId'),itemKind:kind,itemId,countedQuantity:form.get('countedQuantity'),unit:unitFor(kind,itemId)};})}><span>APPEND COUNT</span><select name="locationId" required defaultValue=""><option value="" disabled>Location</option>{warehouse.locations.filter(item=>item.warehouse_id===selectedStocktake.warehouse_id).map(item=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><select name="itemKind" value={countKind} onChange={event=>setCountKind(event.target.value as ItemKind)}><option>PART</option><option>SKU</option><option>VEHICLE</option></select><select name="itemId" required defaultValue=""><option value="" disabled>Inventory item</option>{items(countKind).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select><input name="countedQuantity" inputMode="decimal" placeholder="Physical count" required/><button disabled={selectedStocktake.status!=='OPEN'}>Record count evidence</button></form>:<div className={styles.card}><p className={styles.empty}>Select a stocktake session.</p></div>}
        </div>
        {selectedStocktake?<div className={styles.stocktakeDetail}><div><b>{selectedStocktake.stocktake_number}</b><span>{selectedStocktake.warehouse_name} · {selectedStocktake.status}</span></div><div className={styles.rowActions}>{selectedStocktake.status==='OPEN'?<><button onClick={()=>void action(`/v1/warehouse/stocktakes/${selectedStocktake.id}/close`)}>Close & reconcile</button><button className={styles.secondary} onClick={()=>void action(`/v1/warehouse/stocktakes/${selectedStocktake.id}/cancel`)}>Cancel</button></>:null}</div></div>:null}
        {stocktakeCounts.length?<div className={styles.counts}>{stocktakeCounts.map(row=><div key={row.id}><b>{row.part_number??row.sku??row.frame_number}</b><span>{row.location_code} · {row.counted_quantity} {row.unit}</span><small>{new Date(row.counted_at).toLocaleString()}</small></div>)}</div>:null}
      </section>

      <section className={styles.panel}><div className={styles.sectionHead}><span>MOVEMENT HISTORY</span><h2>Immutable stock timeline</h2></div><div className={styles.tableWrap}><table><thead><tr><th>Movement</th><th>Item</th><th>Type</th><th>Route</th><th>Quantity</th><th>Time</th></tr></thead><tbody>{inventory.movements.map(row=><tr key={row.id}><td>{row.movement_number}</td><td><b>{movementLabel(row)}</b></td><td>{row.movement_type}</td><td>{row.source_warehouse_code?`${row.source_warehouse_code}/${row.source_location_code}`:'External'} → {row.destination_warehouse_code?`${row.destination_warehouse_code}/${row.destination_location_code}`:'External'}</td><td>{row.quantity} {row.unit}</td><td>{new Date(row.occurred_at).toLocaleString()}</td></tr>)}</tbody></table>{!inventory.movements.length?<p className={styles.empty}>No inventory movements yet.</p>:null}</div></section>
    </section>
  </AppShell>;
}
