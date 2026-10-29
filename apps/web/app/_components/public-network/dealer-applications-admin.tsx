'use client';
import { useState } from 'react';
type Application={
 id:string;companyName:string;contactName:string;email:string;country:string;
 partnershipType:string;website:string|null;message:string|null;
 locale:string;status:string;submittedAt:string;
};
export function DealerApplicationsAdmin({initial,available}:{initial:Application[];available:boolean}){
 const [rows,setRows]=useState(initial);
 const [pending,setPending]=useState<string|null>(null);
 const [error,setError]=useState('');
 async function change(id:string,status:string){
  setPending(id);setError('');
  try{
   const response=await fetch('/api/admin/dealer-applications/'+id,{
    method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status}),
   });
   if(!response.ok)throw Error();
   setRows(current=>current.map(row=>row.id===id?{...row,status}:row));
  }catch{setError('状态未保存，请稍后重试。');}
  finally{setPending(null);}
 }
 return <section style={{margin:'0 auto',maxWidth:1320,padding:'48px 24px',color:'#172322',fontFamily:'Arial, sans-serif'}}>
  <p style={{color:'#74857d',fontSize:13}}>ALSVID ADMIN / DEALERS</p>
  <h1 style={{fontSize:32,fontWeight:650,marginBottom:8}}>经销商合作申请</h1>
  <p style={{color:'#61716a',fontSize:14,marginBottom:24}}>官网申请线索 · 保存为待审核申请，不会自动创建经销商账户或授权门店。</p>
  <a href="/admin/dealers" style={{color:'#205b46',fontSize:14}}>← 返回经销商中心</a>
  {!available?<p role="alert" style={{padding:24,background:'#fff0e9',marginTop:24}}>暂时无法读取申请记录。请检查 API 与数据库。</p>
   :rows.length===0?<p style={{padding:24,background:'#f4f6f4',marginTop:24}}>目前还没有收到合作申请。</p>
   :<div style={{overflowX:'auto',marginTop:25}}>
    <table style={{width:'100%',borderCollapse:'collapse',minWidth:880,fontSize:13}}>
     <thead><tr>{['申请时间','公司 / 地区','联系人','邮箱','合作方向','状态','申请说明'].map(h=>
      <th key={h} scope="col" style={{textAlign:'left',padding:'14px 10px',borderBottom:'1px solid #cedad2'}}>{h}</th>)}</tr></thead>
     <tbody>{rows.map(row=><tr key={row.id}>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4'}}>{new Date(row.submittedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</td>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4'}}><strong>{row.companyName}</strong><p>{row.country}</p></td>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4'}}>{row.contactName}</td>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4'}}><a href={'mailto:'+row.email}>{row.email}</a></td>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4'}}>{row.partnershipType}</td>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4'}}>
       <select aria-label={'审核状态 '+row.companyName} value={row.status} disabled={pending===row.id}
        onChange={event=>void change(row.id,event.target.value)}>
        <option value="NEW">新申请</option><option value="REVIEWING">审核中</option>
        <option value="CONTACTED">已联系</option><option value="CLOSED">已关闭</option>
       </select>
      </td>
      <td style={{padding:10,borderBottom:'1px solid #e3e7e4',maxWidth:290,overflowWrap:'anywhere'}}>
       {row.message||'—'}{row.website&&<p><a href={row.website} target="_blank" rel="noopener noreferrer">公司网站</a></p>}
      </td>
     </tr>)}</tbody>
    </table>
   </div>}
  {error&&<p role="alert" style={{color:'#a12819'}}>{error}</p>}
 </section>;
}
