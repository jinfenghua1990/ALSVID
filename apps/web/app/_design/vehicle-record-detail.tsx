'use client';

import { useEffect, useState } from 'react';
import { adminRecordHref, queryRecordId } from './record-links';
import styles from './admin-records.module.css';

type VehicleRecord = {
 id:string;vehicle_code:string;frame_number:string;sku:string;build_spec_code:string;
 production_order_number:string;factory_name:string;unit_no:number;born_at:string;
 production_unit_id:string;production_order_id:string;birth_qc_inspection_id:string;
 lifecycle_state:string;
};
type State = 'loading'|'ready'|'unauthorized'|'failed';
function stamp(value:string) {
 const timestamp=Date.parse(value);
 return Number.isNaN(timestamp)?'—':new Date(timestamp).toLocaleString('zh-CN',{hour12:false});
}
async function getVehicle(id:string):Promise<VehicleRecord>{
 const response=await fetch('/api/control/v1/vehicles/'+encodeURIComponent(id),{cache:'no-store'});
 if(!response.ok){
  if(response.status===401||response.status===403)throw new Error('当前账号无法访问车辆档案，需重新登录或获得 vehicle.read 权限');
  if(response.status===404)throw new Error('找不到此车辆 ID；不会显示其他车辆替代');
  throw new Error('车辆详情读取失败，请刷新后重试');
 }
 const payload:unknown=await response.json();
 if(!payload||typeof payload!=='object'||!('data' in payload)||!payload.data)throw new Error('车辆接口没有返回有效记录');
 return payload.data as VehicleRecord;
}
export function VehicleRecordDetail() {
 const [vehicleId,setVehicleId]=useState<string|null>(null);
 const [records,setRecords]=useState<VehicleRecord[]>([]);
 const [vehicle,setVehicle]=useState<VehicleRecord|null>(null);
 const [state,setState]=useState<State>('loading');
 const [error,setError]=useState('');
 const [readAt,setReadAt]=useState('');
 async function load(id:string|null) {
  setState('loading');setError('');setVehicle(null);
  try{
   if(id){
    const row=await getVehicle(id);
    setVehicle(row);setRecords([]);
   }else{
    const response=await fetch('/api/control/v1/vehicles',{cache:'no-store'});
    if(!response.ok)throw new Error(response.status===403?'没有 vehicle.read 车辆读取权限':'读取车辆列表失败');
    const payload:unknown=await response.json();
    const data=payload&&typeof payload==='object'&&'data' in payload?payload.data:null;
    if(!Array.isArray(data))throw new Error('车辆接口返回格式异常');
    setRecords(data as VehicleRecord[]);
   }
   setReadAt(new Date().toLocaleString('zh-CN',{hour12:false}));setState('ready');
  }catch(ex){setState('failed');setError(ex instanceof Error?ex.message:'车辆读取失败');}
 }
 useEffect(()=>{const id=queryRecordId('vehicleId');setVehicleId(id);void load(id);},[]);
 return <div className={styles.stack}>
  <section className="av-card">
   <div className={styles.heading}><div><h2 className="av-cardtitle">VIN / 车架号 · 真实车辆档案</h2>
    <p className={styles.muted}>来自 Vehicle 领域的真实登记事实。按车辆主键定位，不扫描全部订单或加载采购/库存；不代表已建立车主所有权。</p>
   </div><button type="button" className="av-btn" onClick={()=>{void load(vehicleId);}} disabled={state==='loading'}>刷新档案</button></div>
   <p className={styles.muted}>读取时间：{readAt||'尚未成功读取'}</p>
   {state==='loading'?<p role="status">正在查询车辆档案…</p>:null}
   {state==='failed'?<p role="alert" className={styles.error}>{error}</p>:null}
   {state==='ready'&&vehicle?<div className={styles.stack}>
    <div className={styles.detail}>
     <h3>{vehicle.frame_number} · {vehicle.vehicle_code}</h3>
     <p>SKU：{vehicle.sku} · 构建配置：{vehicle.build_spec_code}</p>
     <p>生产订单：{vehicle.production_order_number} · 生产单元 {vehicle.unit_no}</p>
     <p>工厂：{vehicle.factory_name} · 出生时间：{stamp(vehicle.born_at)}</p>
     <p>车辆登记状态：{vehicle.lifecycle_state}</p>
     <p className={styles.muted}>质检证据 ID：{vehicle.birth_qc_inspection_id}</p>
     <p className={styles.notice}>此处为车辆出生及生产证据，不代表车主确认交付、保修资格或实时定位。</p>
     <p><a href={adminRecordHref('service-intake',vehicle.id)}>进入这台车辆的售后受理 →</a></p>
     <p><a href="/admin/production">返回生产工作台 →</a> · <a href="/admin/production/vin-detail">浏览车辆台账 →</a></p>
    </div>
   </div>:null}
   {state==='ready'&&!vehicle?<div>
    <p className={styles.notice}>当前车辆列表为最多 1000 条记录。点击车架号后会直接按 ID 查询单台车辆，不受列表数量限制。</p>
    {records.length?<div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>车辆 / 车架号</th><th>SKU</th><th>生产单号</th><th>售后</th></tr></thead>
     <tbody>{records.map(row=><tr key={row.id}><td><a href={adminRecordHref('vehicle',row.id)}>{row.frame_number}</a></td><td>{row.sku}</td>
      <td>{row.production_order_number}</td><td><a href={adminRecordHref('service-intake',row.id)}>进入售后 →</a></td></tr>)}</tbody>
    </table></div>:<p className={styles.notice}>暂无已出生车辆记录</p>}
   </div>:null}
  </section>
 </div>;
}
