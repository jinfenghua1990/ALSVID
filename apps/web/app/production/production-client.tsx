'use client';

import { OperationsFrame } from '../_components/operations-frame';


import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './production.module.css';
import { adminRecordHref, queryRecordId } from '../_design/record-links';

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

const statusLabels: Record<string,string> = {
  DRAFT:'草稿',
  RELEASED:'已发布',
  IN_PROGRESS:'生产中',
  QC_PENDING:'待质检',
  COMPLETED:'已完成',
  PLANNED:'待生产',
  ASSEMBLING:'装配中',
  ASSEMBLED:'已装配',
  QC_FAILED:'质检未通过',
  QC_PASSED:'质检通过',
  HOLD:'暂停',
  PASS:'通过',
  FAIL:'未通过',
};
const statusLabel=(status:string)=>statusLabels[status]??status.replaceAll('_',' ');

export default function ProductionClient({ embedded = false }: { embedded?: boolean }){
  const router=useRouter();
  const [summary,setSummary]=useState<Summary>(empty);
  const [vehicles,setVehicles]=useState<Vehicle[]>([]);
  const [factories,setFactories]=useState<Partner[]>([]);
  const [buildSpecs,setBuildSpecs]=useState<BuildSpec[]>([]);
  const [purchaseOrders,setPurchaseOrders]=useState<PurchaseOrder[]>([]);
  const [parts,setParts]=useState<Part[]>([]);
  const [selectedOrderId,setSelectedOrderId]=useState('');
  const [selectedUnitId,setSelectedUnitId]=useState('');
  const [linkedVehicleId,setLinkedVehicleId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [orderQuery,setOrderQuery]=useState('');
  const [vehicleQuery,setVehicleQuery]=useState('');
  const [loadState,setLoadState]=useState<'loading'|'ready'|'error'>('loading');

  async function api(path:string,init?:RequestInit){
    const headers=new Headers(init?.headers);headers.set('content-type','application/json');
    const response=await fetch(`/api/control${path}`,{...init,headers});
    if(response.status===401){router.push('/login');throw new Error('登录状态已失效');}
    const payload=await response.json();if(!response.ok)throw new Error(payload?.message??'请求失败');return payload.data;
  }

  async function reload(){
    setLoadState('loading');
    try{
      const [prod,vehicleRows,partnerRows,engineering,procurement]=await Promise.all([api('/v1/production'),api('/v1/vehicles'),api('/v1/partners'),api('/v1/engineering'),api('/v1/procurement')]);
      setSummary(prod);setVehicles(vehicleRows);setFactories(partnerRows.filter((p:Partner)=>p.roles.includes('FACTORY')));setBuildSpecs(engineering.buildSpecs.filter((spec:BuildSpec)=>spec.status==='RELEASED'));setParts(engineering.parts);setPurchaseOrders(procurement.purchaseOrders.filter((po:PurchaseOrder)=>['CONFIRMED','PARTIALLY_FULFILLED','FULFILLED'].includes(po.status)));
      setLoadState('ready');
    }catch(error){
      setSummary(empty);setVehicles([]);setFactories([]);setBuildSpecs([]);setParts([]);setPurchaseOrders([]);
      setSelectedOrderId('');setSelectedUnitId('');setLinkedVehicleId(null);
      setLoadState('error');
      setMessage('生产数据读取失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }
  useEffect(()=>{
    setLinkedVehicleId(queryRecordId('vehicleId'));
    void reload();
  },[]);

  const selectedOrder=summary.orders.find(order=>order.id===selectedOrderId)??null;
  const units=selectedOrder?summary.units.filter(unit=>unit.production_order_id===selectedOrder.id):[];
  const selectedUnit=summary.units.find(unit=>unit.id===selectedUnitId)??null;
  const bornUnitIds=useMemo(()=>new Set(vehicles.map(vehicle=>vehicle.production_unit_id)),[vehicles]);
  const linkedVehicle=vehicles.find(vehicle=>vehicle.id===linkedVehicleId)??null;
  const filteredOrders=useMemo(()=>summary.orders.filter(order=>[order.production_order_number,order.sku,order.factory_name,order.build_spec_code,order.status].join(' ').toLowerCase().includes(orderQuery.trim().toLowerCase())),[summary.orders,orderQuery]);
  const filteredVehicles=useMemo(()=>vehicles.filter(vehicle=>[vehicle.frame_number,vehicle.sku,vehicle.production_order_number,vehicle.factory_name].join(' ').toLowerCase().includes(vehicleQuery.trim().toLowerCase())),[vehicles,vehicleQuery]);
  const metrics=useMemo(()=>['DRAFT','RELEASED','IN_PROGRESS','QC_PENDING','COMPLETED'].map(status=>[status,summary.orders.filter(order=>order.status===status).length] as const),[summary.orders]);

  async function action(endpoint:string,body:unknown={}){try{await api(endpoint,{method:'POST',body:JSON.stringify(body)});setMessage('已更新。');await reload();}catch(error){setMessage(error instanceof Error?error.message:'无法更新');}}
  async function submit(event:FormEvent<HTMLFormElement>,endpoint:string,build:(form:FormData)=>unknown){event.preventDefault();const form=new FormData(event.currentTarget);try{await api(endpoint,{method:'POST',body:JSON.stringify(build(form))});setMessage('已保存。');await reload();}catch(error){setMessage(error instanceof Error?error.message:'无法保存');}}

  return <OperationsFrame embedded={embedded} area="production" footer="ALSVID · 内部管理">
    <section>
      <header className={styles.header}><div><div className={styles.eyebrow}>生产 / 质检追踪</div><h1>生产制造</h1><p>按生产订单、生产单元和车辆出生台账处理业务；质检和不可变车架号规则保持不变。</p></div></header>
      {message?<div className={styles.notice}>{message}</div>:null}
      <div className={styles.metrics}>{metrics.map(([status,count])=><div key={status}><span>{statusLabel(status)}</span><b>{loadState==='ready'?count:'—'}</b></div>)}</div>

      <details className={styles.createDrawer} id="new-production-order">
        <summary>＋ 新建生产订单 <span>按已发布配置、工厂和数量创建草稿</span></summary>
        <form className={styles.formCard} onSubmit={(event)=>void submit(event,'/v1/production/orders',(form)=>({buildSpecId:form.get('buildSpecId'),factoryPartnerId:form.get('factoryPartnerId'),sourcePurchaseOrderId:form.get('sourcePurchaseOrderId')||undefined,plannedQuantity:Number(form.get('plannedQuantity')),plannedStartDate:form.get('plannedStartDate')||undefined,plannedCompletionDate:form.get('plannedCompletionDate')||undefined,note:form.get('note')||undefined}))}><span>新建生产订单</span><h2>发布可执行的生产需求</h2><select name="buildSpecId" required defaultValue=""><option value="" disabled>选择已发布 Build Specification</option>{buildSpecs.map(spec=><option key={spec.id} value={spec.id}>{spec.code} · {spec.sku}</option>)}</select><select name="factoryPartnerId" required defaultValue=""><option value="" disabled>选择工厂</option>{factories.map(factory=><option key={factory.id} value={factory.id}>{factory.partnerCode} · {factory.displayName}</option>)}</select><select name="sourcePurchaseOrderId" defaultValue=""><option value="">不关联采购订单</option>{purchaseOrders.map(po=><option key={po.id} value={po.id}>{po.po_number} · {po.supplier_name}</option>)}</select><div className={styles.inline}><input name="plannedQuantity" type="number" min="1" placeholder="数量" required/><input name="plannedStartDate" type="date"/><input name="plannedCompletionDate" type="date"/></div><input name="note" placeholder="生产备注"/><button>创建草稿订单</button></form>
      </details>

      <section className={styles.dataSection} id="work-orders" aria-label="生产订单表格">
        <div className={styles.sectionHead}>
          <div><h2>生产订单</h2><span>一行一张生产单，点击处理后显示执行动作</span></div>
          <input className={styles.dataSearch} type="search" aria-label="搜索生产订单" placeholder="搜索单号、SKU、工厂、状态" value={orderQuery} onChange={event=>setOrderQuery(event.target.value)}/>
        </div>
        <div className={styles.tableWrap}><table className={styles.dataTable}>
          <thead><tr><th>生产单号</th><th>SKU / 配置</th><th>工厂</th><th>计划数量</th><th>单元数</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{filteredOrders.map(order=><tr key={order.id} data-selected={selectedOrderId===order.id}>
            <td><strong>{order.production_order_number}</strong></td><td>{order.sku}<small>{order.build_spec_code}</small></td>
            <td>{order.factory_name}</td><td>{order.planned_quantity}</td><td>{order.unit_count}</td>
            <td>{statusLabel(order.status)}</td><td><button type="button" className={styles.actionLink} aria-expanded={selectedOrderId===order.id} onClick={()=>{setSelectedOrderId(selectedOrderId===order.id?'':order.id);setSelectedUnitId('');}}>{selectedOrderId===order.id?'收起':'处理'}</button></td>
          </tr>)}{!filteredOrders.length?<tr><td colSpan={7} className={styles.empty}>{loadState==='loading'?'正在读取生产订单…':loadState==='error'?'生产数据不可用，无法确认订单记录':orderQuery?'没有符合条件的生产单':'暂无生产订单'}</td></tr>:null}</tbody>
        </table></div>
        <p className={styles.rowCount}>显示 {filteredOrders.length} / {summary.orders.length} 张生产单</p>
        {selectedOrder?<div className={styles.inlineDetail} aria-label="选中生产订单的处理区">
          <div className={styles.sectionHead}><div><h3>{selectedOrder.production_order_number} · {selectedOrder.sku}</h3><span>{statusLabel(selectedOrder.status)} · {selectedOrder.factory_name}</span></div>
            <div className={styles.orderActions}>{selectedOrder.status==='DRAFT'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/release`)}>发布订单</button>:null}{selectedOrder.status==='RELEASED'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/start`)}>开始生产</button>:null}{selectedOrder.status==='IN_PROGRESS'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/qc`)}>转入质检</button>:null}{selectedOrder.status==='QC_PENDING'?<button onClick={()=>void action(`/v1/production/orders/${selectedOrder.id}/complete`)}>完成订单</button>:null}</div>
          </div>
          <div className={styles.tableWrap}><table className={styles.dataTable} aria-label="生产单元表格"><thead><tr><th>生产单元</th><th>状态</th><th>车辆</th><th>操作</th></tr></thead>
            <tbody>{units.map(unit=><tr key={unit.id} data-selected={selectedUnitId===unit.id}><td>单元 {unit.unit_no}</td><td>{statusLabel(unit.status)}</td><td>{bornUnitIds.has(unit.id)?'已出生':'未出生'}</td>
              <td><button type="button" className={styles.actionLink} onClick={()=>setSelectedUnitId(selectedUnitId===unit.id?'':unit.id)}>{selectedUnitId===unit.id?'收起':'质检 / 处理'}</button></td></tr>)}
              {!units.length?<tr><td colSpan={4} className={styles.empty}>该订单尚未生成生产单元</td></tr>:null}</tbody>
          </table></div>
        </div>:null}
      </section>

      {selectedUnit?<section className={styles.unitWorkspace} id="quality" aria-label="装配与质检"><div className={styles.unitHeader}><div><span>生产单元</span><h2>{selectedUnit.production_order_number} / 单元 {selectedUnit.unit_no}</h2><p>{statusLabel(selectedUnit.status)}</p></div>{selectedUnit.status==='PLANNED'||selectedUnit.status==='ASSEMBLING'?<button onClick={()=>void action(`/v1/production/units/${selectedUnit.id}/assembled`)}>标记装配完成</button>:null}</div><div className={styles.unitForms}>
        <form onSubmit={(event)=>void submit(event,`/v1/production/units/${selectedUnit.id}/inspect`,(form)=>({result:form.get('result'),checklistCode:form.get('checklistCode')||undefined,note:form.get('note')||undefined,checklist:{visual:true,brakes:true,drive:true}}))}><span>质检记录</span><h3>追加质量证据</h3><select name="result"><option value="PASS">通过</option><option value="FAIL">未通过</option><option value="HOLD">暂停</option></select><input name="checklistCode" placeholder="QC-FC1-V1"/><input name="note" placeholder="质检备注"/><button disabled={!['QC_PENDING','QC_FAILED','HOLD'].includes(selectedUnit.status)}>记录质检结果</button></form>
        <form onSubmit={(event)=>void submit(event,`/v1/production/units/${selectedUnit.id}/deviations`,(form)=>({expectedPartId:form.get('expectedPartId'),actualPartId:form.get('actualPartId'),quantity:form.get('quantity'),serialNumber:form.get('serialNumber')||undefined,reason:form.get('reason')}))}><span>实装偏差</span><h3>记录已授权替代件</h3><select name="expectedPartId" required defaultValue=""><option value="" disabled>标准零件</option>{parts.map(part=><option key={part.id} value={part.id}>{part.part_number} · {part.name}</option>)}</select><select name="actualPartId" required defaultValue=""><option value="" disabled>实际安装零件</option>{parts.map(part=><option key={part.id} value={part.id}>{part.part_number} · {part.name}</option>)}</select><div className={styles.inline}><input name="quantity" inputMode="decimal" placeholder="数量" required/><input name="serialNumber" placeholder="序列号（可选）"/></div><input name="reason" placeholder="偏差原因" required/><button>记录偏差</button></form>
        <form onSubmit={(event)=>void submit(event,'/v1/vehicles/birth',(form)=>({productionUnitId:selectedUnit.id,frameNumber:form.get('frameNumber')}))}><span>车辆出生</span><h3>绑定不可变车架身份</h3><input name="frameNumber" placeholder="ALS-FC1-000001" required/><button disabled={selectedUnit.status!=='QC_PASSED'||bornUnitIds.has(selectedUnit.id)}>{bornUnitIds.has(selectedUnit.id)?'车辆已经出生':'创建车辆'}</button></form>
      </div><div className={styles.evidence}><div><span>质检历史</span>{summary.inspections.filter(item=>item.production_unit_id===selectedUnit.id).map(item=><p key={item.id}><b>{statusLabel(item.result)}</b><small>{new Date(item.inspected_at).toLocaleString()} · {item.note||'无备注'}</small></p>)}</div><div><span>实装偏差</span>{summary.deviations.filter(item=>item.production_unit_id===selectedUnit.id).map(item=><p key={item.id}><b>{item.expected_part_number} → {item.actual_part_number}</b><small>{item.quantity} · {item.reason}</small></p>)}</div></div></section>:null}

      <section className={styles.vehicles} id="registered-vehicles">
        <div className={styles.sectionHead}><span>车辆登记</span><h2>从生产事实生成车辆身份</h2></div>
        {linkedVehicleId?(linkedVehicle?<div className={styles.notice} role="status">
          <strong>已定位车辆：</strong> {linkedVehicle.frame_number} · {linkedVehicle.sku} · 生产单 {linkedVehicle.production_order_number}。
          <a href={adminRecordHref('service-intake',linkedVehicle.id)}> 为此车新建售后记录 →</a>
        </div>:<p className={styles.notice} role="status">链接对应车辆未出现在当前返回的车辆记录中（可能已超出返回上限），不会代替展示其他车辆。</p>):null}
        <div className={styles.sectionHead}><span>已出生车辆：{vehicles.length} 台</span><input className={styles.dataSearch} type="search" aria-label="搜索车辆" placeholder="搜索车架号、SKU、生产单" value={vehicleQuery} onChange={event=>setVehicleQuery(event.target.value)}/></div>
        <div className={styles.tableWrap}><table className={styles.dataTable} aria-label="车辆出生台账">
          <thead><tr><th>车架号</th><th>车辆编码</th><th>SKU / 配置</th><th>生产单 / 单元</th><th>工厂</th><th>出生时间</th><th>操作</th></tr></thead>
          <tbody>{filteredVehicles.map(vehicle=><tr key={vehicle.id} id={'vehicle-'+vehicle.id}>
            <td><a href={adminRecordHref('vehicle',vehicle.id)}>{vehicle.frame_number}</a></td><td>{vehicle.vehicle_code}</td><td>{vehicle.sku}<small>{vehicle.build_spec_code}</small></td>
            <td>{vehicle.production_order_number} / {vehicle.unit_no}</td><td>{vehicle.factory_name}</td>
            <td>{new Date(vehicle.born_at).toLocaleString('zh-CN')}</td><td><a href={adminRecordHref('service-intake',vehicle.id)}>售后</a></td>
          </tr>)}{!filteredVehicles.length?<tr><td colSpan={7} className={styles.empty}>{loadState==='loading'?'正在读取车辆记录…':loadState==='error'?'车辆数据不可用':vehicleQuery?'没有符合条件的车辆':'暂无已出生车辆'}</td></tr>:null}</tbody>
        </table></div>
      </section>
    </section>
  </OperationsFrame>;
}
