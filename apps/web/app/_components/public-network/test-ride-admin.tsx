"use client";
import { useState } from "react";
import styles from "./test-ride-admin.module.css";

export type TestRideStatus="NEW"|"REVIEWING"|"CONTACTED"|"CLOSED";
export type TestRideLead={
 id:string;name:string;email:string;country:"DE"|"AT";city:string;
 model:string;colour:string;locale:string;status:TestRideStatus;
 assignedLocationId:string|null;notificationState:string;
 createdAt:string;updatedAt:string;
};
export type TestRidePartnerLocation={
 id:string;name:string;country:"DE"|"AT";city:string;address:string;
 approved:boolean;active:boolean;testRideAuthorized:boolean;partnerEligible:boolean;
};
const statusNames:Record<TestRideStatus,string>={
 NEW:"新申请",REVIEWING:"处理中",CONTACTED:"已联系",CLOSED:"已关闭"
};
const stamp=(value:string)=>new Date(value).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"});

export function TestRideAdmin({
 initialRequests,initialLocations,requestsAvailable,locationsAvailable
}:{
 initialRequests:TestRideLead[];initialLocations:TestRidePartnerLocation[];
 requestsAvailable:boolean;locationsAvailable:boolean;
}){
 const [requests,setRequests]=useState(initialRequests);
 const [locations,setLocations]=useState(initialLocations);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");
 const count=(status:TestRideStatus)=>requests.filter(x=>x.status===status).length;
 const eligible=(lead:TestRideLead)=>locations.filter(loc=>loc.country===lead.country&&
  loc.approved&&loc.active&&loc.partnerEligible&&loc.testRideAuthorized);
 async function changeLead(id:string,status:TestRideStatus,locationId:string|null){
  setBusy(id);setError("");
  try{
   const response=await fetch("/api/admin/test-rides/"+id,{
    method:"PATCH",headers:{"content-type":"application/json"},
    body:JSON.stringify({status,locationId})
   });
   if(!response.ok)throw Error("Request update rejected");
   setRequests(current=>current.map(item=>item.id===id?{...item,status,assignedLocationId:locationId}:item));
  }catch{setError("试骑申请未保存，请检查网点是否已审核授权以及 API 状态。");}
  finally{setBusy(null);}
 }
 async function changeLocation(id:string,enabled:boolean){
  setBusy("location:"+id);setError("");
  try{
   const response=await fetch("/api/admin/test-rides/locations/"+id,{
    method:"PATCH",headers:{"content-type":"application/json"},
    body:JSON.stringify({enabled})
   });
   if(!response.ok)throw Error("Location update rejected");
   setLocations(current=>current.map(item=>item.id===id?{...item,testRideAuthorized:enabled}:item));
   if(!enabled)setRequests(current=>current.map(item=>item.assignedLocationId===id && item.status!=="CLOSED"?{...item,assignedLocationId:null}:item));
  }catch{setError("网点状态没有保存。请确认该网点已获得正式授权并允许公开展示。");}
  finally{setBusy(null);}
 }
 return <main className={styles.main}>
  <div className={styles.top}>
   <div><p className={styles.kicker}>ALSVID ADMIN / DEALERS</p>
    <h1>客户试骑申请</h1>
    <p className={styles.lead}>官网 FC1 试骑意向 · 仅登记与人工分配，不自动确认试骑日期或预约。</p></div>
   <a className={styles.back} href="/admin/dealers">返回经销商中心</a>
  </div>
  <div className={styles.metrics} aria-label="最近200条试骑申请状态统计">
   {(["NEW","REVIEWING","CONTACTED","CLOSED"] as const).map(key=><div key={key} className={styles.metric}>
    <span>{statusNames[key]}</span><strong>{requestsAvailable?count(key):"—"}</strong>
   </div>)}
  </div>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <section className={styles.section} aria-labelledby="test-ride-list-title">
   <div className={styles.sectionHead}><h2 id="test-ride-list-title">试骑意向列表</h2><span>最近 200 条</span></div>
   {!requestsAvailable?<p role="alert" className={styles.unavailable}>无法读取试骑申请，请检查系统接口和数据库迁移。不能将接口错误视为没有申请。</p>
    :!requests.length?<p className={styles.empty}>目前尚无试骑申请。</p>
    :<div className={styles.tableScroll}><table>
     <thead><tr>{["申请时间","客户与车型","国家 / 城市","邮箱","状态","分配试骑网点","邮件通知"].map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead>
     <tbody>{requests.map(row=><tr key={row.id}>
      <td className={styles.mono}>{stamp(row.createdAt)}</td>
      <td><strong>{row.name||"未填写姓名"}</strong><small>{row.model} · {row.colour}</small></td>
      <td>{row.country} · {row.city}</td>
      <td><a href={"mailto:"+row.email}>{row.email}</a></td>
      <td><select aria-label={"状态 "+row.email} disabled={busy===row.id} value={row.status}
       onChange={e=>void changeLead(row.id,e.target.value as TestRideStatus,row.assignedLocationId)}>
       {(Object.keys(statusNames) as TestRideStatus[]).map(key=><option key={key} value={key}>{statusNames[key]}</option>)}
      </select></td>
      <td>
       <select aria-label={"分配试骑网点 "+row.email} disabled={busy===row.id||!locationsAvailable}
         value={row.assignedLocationId??""}
         onChange={e=>void changeLead(row.id,row.status,e.target.value||null)}>
        <option value="">未分配</option>
        {eligible(row).map(loc=><option key={loc.id} value={loc.id}>{loc.name} · {loc.city}</option>)}
        {row.assignedLocationId&&!eligible(row).some(loc=>loc.id===row.assignedLocationId)?
         <option value={row.assignedLocationId} disabled>已关联网点暂不可用</option>:null}
       </select>
       {!eligible(row).length&&<small>暂无已授权的同国家试骑网点</small>}
      </td>
      <td><span className={styles.mail}>{row.notificationState==="SENT"?"已通知内部":row.notificationState==="FAILED"?"通知失败":row.notificationState==="UNCONFIGURED"?"未配置邮件":"等待通知"}</span></td>
     </tr>)}</tbody>
    </table></div>}
  </section>
  <section className={styles.section} aria-labelledby="trial-location-title">
   <div className={styles.sectionHead}><h2 id="trial-location-title">合作经销商试骑网点</h2><span>审核授权后才能分配申请</span></div>
   {!locationsAvailable?<p role="alert" className={styles.unavailable}>网点数据暂不可读取，未执行任何授权变更。</p>
    :!locations.length?<p className={styles.empty}>当前还没有登记经过审核的网点，不能虚构试骑位置。先完成经销商网点入驻及审核。</p>
    :<div className={styles.locationGrid}>{locations.map(loc=><article className={styles.locationCard} key={loc.id}>
     <div><strong>{loc.name}</strong><p>{loc.country} · {loc.city}</p><small>{loc.address}</small></div>
     <div className={styles.locationFoot}>
      <span>{!loc.approved?"待公开审核":!loc.active?"授权未生效":!loc.partnerEligible?"非有效经销商":loc.testRideAuthorized?"已开放试骑意向":"未开放试骑"}</span>
      <label className={styles.toggle}><input type="checkbox" checked={loc.testRideAuthorized}
        disabled={busy==="location:"+loc.id||!loc.approved||!loc.active||!loc.partnerEligible}
        onChange={event=>void changeLocation(loc.id,event.target.checked)}/>试骑可分配</label>
     </div>
    </article>)}</div>}
   <p className={styles.notice}>网点启用仅代表可接收人工分配的试骑意向，不代表已经排班、有现车或可向客户确认试骑时间。</p>
  </section>
 </main>;
}
