'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './production.module.css';

type Partner = { id:string; partnerCode:string; displayName:string; roles:string[] };
type BuildSpec = { id:string; code:string; status:string; sku:string };
type PurchaseOrder = { id:string; po_number:string; supplier_name:string; status:string };
type Part = { id:string; part_number:string; name:string };
type ProductionOrder = { id:string; production_order_number:string; build_spec_id:string; build_spec_code:string; sku:string; factory_partner_id:string; factory_name:string; source_purchase_order_id:string|null; planned_quantity:number; status:string; unit_count:number; created_at:string };
type Unit = { id:string; production_order_id:string; production_order_number:string; unit_no:number; status:string };
type Inspection = { id:string; production_unit_id:string; result:string; note:string; inspected_at:string };
type Deviation = { id:string; production_unit_id:string; expected_part_number:string; actual_part_number:string; quantity:string; reason:string; created_at:string };
type Vehicle = { id:string; vehicle_code:string; frame_number:string; production_unit_id:string; production_order_number:string; build_spec_code:string; sku:string; factory_name:string; unit_no:number; born_at:string };
type Summary = { orders:ProductionOrder[]; units:Unit[]; inspections:Inspection[]; deviations:Deviation[]; history:unknown[] };
const empty:Summary={orders:[],units:[],inspections:[],deviations:[],history:[]};

export default function ProductionClient(){
  const router=useRouter();
  const [summary,setSummary]=useState<Summary>(empty);
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [factories,setFactories]=useState<Partner[]>([]);
  const [buildSpecs,setBuildSpecs]=useState<BuildSpec[]>([]);
  const [purchaseOrders,setPurchaseOrders]=useState<PurchaseOrder[]>([]);
  const [parts,setParts]=useState<Part[]>([]);
  const [selectedOrderId,setSelectedOrderId]=useState('');
  const [selectedUnitId,setSelectedUnitId]=useState('');
  const [message,setMessage]=useState('');

  async function api(path:string,init?:RequestInit){
    const headers=new Headers(init?.headers);headers.set('content-type','application/json');
    const response=await fetch(`/api/control${path}`,{...init,headers});
    if(response.status===401){router.push('/login');throw new Error('Session expired');}
    const payload=await response.json();if(!response.ok)throw new Error(payload?.message??'Request failed');return payload.data;
  }

  async function reload(){
    try{
      const [prod,vehicleRows,partnerRows,engineering,procurement]=await Promise.all([api('/v1/production'),api('/v1/vehicles'),api('/v1/partners'),api('/v1/engineering'),api('/v1/procurement')]);
      setSummary(prod);setVehicles(vehicleRows);setFactories(partnerRows.filter((p:Partner)=>p.roles.includes('FACTORY')));setBuildSpecs(engineering.buildSpecs.filter((spec:BuildSpec)=>spec.status==='RELEASED'));setParts(engineering.parts);setPurchaseOrders(procurement.purchaseOrders.filter((po:PurchaseOrder)=>['CONFIRMED','PARTIALLY_FULFILLED','FULFILLED'].includes(po.status)));
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to load Production workspace');}
  }
  useEffect(()=>{void reload();},[]);

  const selectedOrder=summary.orders.find(order=>order.id===selectedOrderId)??null;
  const units=selectedOrder?summary.units.filter(unit=>unit.production_order_id===selectedOrder.id):[];
  const selectedUnit=summary.units.find(unit=>unit.id===selectedUnitId)??null;
  const bornUnitIds=useMemo(()=>new Set(vehicles.map(vehicle=>vehicle.production_unit_id)),[vehicles]);
  const metrics=useMemo(()=>['DRAFT','RELEASED','IN_PROGRESS','QC_PENDING','COMPLETED'].map(status=>[status,summary.orders.filter(order=>order.status===status).length] as const),[summary.orders]);

  async function action(endpoint:string,body:unknown={}){try{await api(endpoint,{method:'POST',body:JSON.stringify(body)});setMessage('Updated.');await reload();}catch(error){setMessage(error instanceof Error?error.message:'Unable to update');}}
  async function submit(event:FormEvent<HTMLFormElement>,endpoint:string,build:(form:FormData)=>unknown){event.preventDefault();const form=new FormData(event.currentTarget);try{await api(endpoint,{method:'POST',body:JSON.stringify(build(form))});setMessage('Saved.');await reload();}catch(error){setMessage(error instanceof Error?error.message:'Unable to save');}}

  return <main className={styles.shell}>
    <aside className={styles.rail}><a className={styles.brand} href="/">ALSVID</a><nav><a href="/">Overview</a><a href="/product">Product</a><a href="/supply">Procurement</a><a className={styles.active} href="/production">Production</a><a href="/partners">Partners</a></nav><div className={styles.foot}>Production · QC · Vehicle Birth</div></aside>
    <section className={styles.workspace}>
      <header className={styles.header}><div><div className={styles.eyebrow}>FACTORY EXECUTION</div><h1>Build a physical bicycle from released truth.</h1><p>Every unit inherits an immutable Build Specification baseline. QC evidence gates Vehicle birth; a frame number is never just another editable product field.</p></div></header>
      {message?<div className={styles.notice}>{message}</div>:null}
      <div className={styles.metrics}>{metrics.map(([status,count])=><div key={status}><span>{status.replaceAll('_',' ')}</span><b>{count}</b></div>)}</div>

      <section className={styles.topGrid}>
        <form className={styles.formCard} onSubmit={(event)=>void submit(event,'/v1/production/orders',(form)=>({buildSpecId:form.get('buildSpecId'),factoryPartnerId:form.get('factoryPartnerId'),sourcePurchaseOrderId:form.get('sourcePurchaseOrderId')||undefined,plannedQuantity:Number(form.get('plannedQuantity')),plannedStartDate:form.get('plannedStartDate')||undefined,plannedCompletionDate:form.get('plannedCompletionDate')||undefined,note:form.get('note')||undefined}))}><span>NEW PRODUCTION ORDER</span><h2>Release-ready build demand</h2><select name="buildSpecId" required defaultValue=""><option value="" disabled>Released Build Specification</option>{buildSpecs.map(spec=><option key={spec.id} value={spec.id}>{spec.code} · {spec.sku}</option>)}</select><select name="factoryPartnerId" required defaultValue=""><option value="" disabled>Factory</option>{factories.map(factory=><option key={factory.id} value={factory.id}>{factory.partnerCode} · {factory.displayName}</option>)}</select><select name="sourcePurchaseOrderId" defaultValue=""><option value="">No procurement source</option>{purchaseOrders.map(po=><option key={po.id} value={po.id}>{po.po_number} · {po.supplier_name}</option>)}</select><div className={styles.inline}><input name="plannedQuantity" type="number" min="1" placeholder="Qty" required/><input name="plannedStartDate" type="date"/><input name="plannedCompletionDate" type="date"/></div><input name="note" placeholder="Production note"/><button>Create draft order</button></form>
        <div className={styles.vehicleCard}><span>VEHICLE BIRTH</span><h2>Born Vehicles</h2><b>{vehicles.length}</b><p>Each Vehicle is bound to one QC-passed production unit and one unique immutable frame number.</p></div>
      </section>

      <section className={styles.layout}>
        <div className={styles.orders}><div className={styles.sectionHead}><span>PRODUCTION ORDERS</span><h2>Factory execution queue</h2></div>{summary.orders.map(order=><article key={order.id} className={`${styles.orderRow} ${selectedOrderId===order.id?styles.selected:''}`} onClick={()=>setSelectedOrderId(order.id)}><div><b>{order.production_order_number}</b><span>{order.sku} · {order.build_spec_code}</span><small>{order.factory_name} · {order.planned_quantity} units</small></div><div><i>{order.status.replaceAll('_',' ')}</i><small>{order.unit_count} units created</small></div></article>)}{!summary.orders.length?<p className={styles.empty}>No production orders yet.</p>:null}</div>

        <aside className={styles.orderDetail}>{selectedOrder?<><div className={styles.detailHead}><span>{selectedOrder.production_order_number}</span><h2>{selectedOrder.sku}</h2><p>{selectedOrder.status} · {selectedOrder.factory_name}</p></div><div className={styles.orderActions}>{selectedOrder.status==='DRAFT'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/release`)}>Release order</button>:null}{selectedOrder.status==='RELEASED'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/start`)}>Start production</button>:null}{selectedOrder.status==='IN_PROGRESS'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/qc`)}>Move to QC</button>:null}{selectedOrder.status==='QC_PENDING'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/complete`)}>Complete order</button>:null}</div><div className={styles.unitList}>{units.map(unit=><button key={unit.id} className={selectedUnitId===unit.id?styles.unitSelected:''} onClick={()=>setSelectedUnitId(unit.id)}><b>Unit {unit.unit_no}</b><span>{unit.status.replaceAll('_',' ')}</span>{bornUnitIds.has(unit.id)?<i>Vehicle born</i>:null}</button>)}</div></>:<p className={styles.empty}>Select a Production Order.</p>}</aside>
      </section>

      {selectedUnit?<section className={styles.unitWorkspace}><div className={styles.unitHeader}><div><span>PRODUCTION UNIT</span><h2>{selectedUnit.production_order_number} / Unit {selectedUnit.unit_no}</h2><p>{selectedUnit.status.replaceAll('_',' ')}</p></div>{selectedUnit.status==='PLANNED'||selectedUnit.status==='ASSEMBLING'?<button onClick={()=>void action(`/v1/production/units/${selectedUnit.id}/assembled`)}>Mark assembled</button>:null}</div><div className={styles.unitForms}>
        <form onSubmit={(event)=>void submit(event,`/v1/production/units/${selectedUnit.id}/inspect`,(form)=>({result:form.get('result'),checklistCode:form.get('checklistCode')||undefined,note:form.get('note')||undefined,checklist:{visual:true,brakes:true,drive:true}}))}><span>QC INSPECTION</span><h3>Append quality evidence</h3><select name="result"><option>PASS</option><option>FAIL</option><option>HOLD</option></select><input name="checklistCode" placeholder="QC-FC1-V1"/><input name="note" placeholder="Inspection note"/><button disabled={!['QC_PENDING','QC_FAILED','HOLD'].includes(selectedUnit.status)}>Record QC result</button></form>
        <form onSubmit={(event)=>void submit(event,`/v1/production/units/${selectedUnit.id}/deviations`,(form)=>({expectedPartId:form.get('expectedPartId'),actualPartId:form.get('actualPartId'),quantity:form.get('quantity'),serialNumber:form.get('serialNumber')||undefined,reason:form.get('reason')}))}><span>AS-BUILT DEVIATION</span><h3>Record authorized substitution</h3><select name="expectedPartId" required defaultValue=""><option value="" disabled>Expected part</option>{parts.map(part=><option key={part.id} value={part.id}>{part.part_number} · {part.name}</option>)}</select><select name="actualPartId" required defaultValue=""><option value="" disabled>Actual part</option>{parts.map(part=><option key={part.id} value={part.id}>{part.part_number} · {part.name}</option>)}</select><div className={styles.inline}><input name="quantity" inputMode="decimal" placeholder="Qty" required/><input name="serialNumber" placeholder="Serial (optional)"/></div><input name="reason" placeholder="Deviation reason" required/><button>Record deviation</button></form>
        <form onSubmit={(event)=>void submit(event,'/v1/vehicles/birth',(form)=>({productionUnitId:selectedUnit.id,frameNumber:form.get('frameNumber')}))}><span>VEHICLE BIRTH</span><h3>Assign immutable frame identity</h3><input name="frameNumber" placeholder="ALS-FC1-000001" required/><button disabled={selectedUnit.status!=='QC_PASSED'||bornUnitIds.has(selectedUnit.id)}>{bornUnitIds.has(selectedUnit.id)?'Vehicle already born':'Birth Vehicle'}</button></form>
      </div><div className={styles.evidence}><div><span>QC HISTORY</span>{summary.inspections.filter(item=>item.production_unit_id===selectedUnit.id).map(item=><p key={item.id}><b>{item.result}</b><small>{new Date(item.inspected_at).toLocaleString()} · {item.note||'No note'}</small></p>)}</div><div><span>DEVIATIONS</span>{summary.deviations.filter(item=>item.production_unit_id===selectedUnit.id).map(item=><p key={item.id}><b>{item.expected_part_number} → {item.actual_part_number}</b><small>{item.quantity} · {item.reason}</small></p>)}</div></div></section>:null}

      <section className={styles.vehicles}><div className={styles.sectionHead}><span>VEHICLE REGISTRY</span><h2>Physical identity born from production</h2></div><div className={styles.vehicleGrid}>{vehicles.map(vehicle=><article key={vehicle.id}><span>{vehicle.vehicle_code}</span><b>{vehicle.frame_number}</b><p>{vehicle.sku} · {vehicle.build_spec_code}</p><small>{vehicle.production_order_number} / Unit {vehicle.unit_no} · {vehicle.factory_name}</small></article>)}{!vehicles.length?<p className={styles.empty}>No Vehicles have been born yet.</p>:null}</div></section>
    </section>
  </main>;
}
