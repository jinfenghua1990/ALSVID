'use client';

import {useCallback,useEffect,useState} from 'react';

/** 
 * Safe operations dashboard: draft/submitted order counts are real records, NOT revenue.
 * PV/UV, conversion, successful payment and executed refunds are intentionally unavailable
 * until separately verified upstream sources exist.
 */
type Load<T>={status:'loading'|'ready'|'error';data?:T;error?:string;readAt?:string};
type OrderFacts={total:number;draft:number;submitted:number;other:number};
type RefundFacts={requests:number};
const missing='待接入可信数据源';

const groups=[
 {title:'流量与访客',description:'尚未接入合法合规的访问事件与访客去重；不能以订单数推算 UV/PV。',
  fields:['独立访客 UV','页面浏览 PV','来源渠道','新访客占比']},
 {title:'页面与转化',description:'尚未接入浏览、商品兴趣、加购、结账的同口径事件流。',
  fields:['页面跳转路径','商品详情到加购','结账转化率','关键环节流失率']},
 {title:'交易与销售',description:'现有第一方订单 API 仅提供草稿及提交记录；缺 PSP 付款核验不显示销售收入。',
  fields:['第一方订单（全部状态）','内部草稿订单','已提交订单（非支付确认）','支付订单数','支付金额','客单价','支付转化率']},
 {title:'售后与退款',description:'来自现有退款审核请求列表；审核请求不等于执行成功的退款。',
  fields:['退款审核申请数','已执行退款订单数','退款金额','退款率','售后工单率']},
] as const;

export function readOrderFacts(input:unknown):OrderFacts {
 if(!input||typeof input!=='object')throw new Error('商城订单摘要格式异常');
 const o=input as Record<string,unknown>;
 if(typeof o.orderTotal!=='number'||!Number.isSafeInteger(o.orderTotal)||o.orderTotal<0)
   throw new Error('商城订单总数不可用');
 const dist=o.orderStatusCounts;
 if(!dist||typeof dist!=='object'||Array.isArray(dist))throw new Error('订单状态分布不可用');
 const counts=dist as Record<string,unknown>;
 const get=(key:string)=> {
   const value=counts[key]??0;
   if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error('订单状态分布格式异常');
   return value;
 };
 const draft=get('DRAFT'),submitted=get('SUBMITTED');
 if(draft+submitted>o.orderTotal)throw new Error('订单状态统计存在不一致');
 return {total:o.orderTotal,draft,submitted,other:o.orderTotal-draft-submitted};
}
export function readRefundFacts(input:unknown):RefundFacts {
 if(!Array.isArray(input))throw new Error('退款审核请求格式异常');
 // Provider endpoint is currently limited to 100 rows: never label as all-time total.
 if(input.some(x=>!x||typeof x!=='object'||!('id' in x)))throw new Error('退款审核请求记录格式异常');
 return {requests:input.length};
}

async function readAuthorized(path:string,signal:AbortSignal):Promise<unknown> {
 const response=await fetch('/api/control'+path,{signal,cache:'no-store'});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(response.status===401?'登录已过期，请重新登录'
   :response.status===403?'当前账号没有查看此数据的权限'
   :typeof body?.message==='string'?body.message:'数据读取失败');
 if(body===null||!('data' in body))throw new Error('数据响应缺少 data');
 return body.data as unknown;
}

export function BusinessAnalyticsOverview(){
 const [orders,setOrders]=useState<Load<OrderFacts>>({status:'loading'});
 const [refunds,setRefunds]=useState<Load<RefundFacts>>({status:'loading'});
 const [refresh,setRefresh]=useState(0);
 const reload=useCallback(()=>setRefresh(n=>n+1),[]);
 useEffect(()=>{
   const abort=new AbortController();
   setOrders({status:'loading'});setRefunds({status:'loading'});
   const date=()=>new Date().toLocaleString('zh-CN');
   void readAuthorized('/v1/commerce/storefront/summary',abort.signal).then(readOrderFacts)
     .then(data=>{if(!abort.signal.aborted)setOrders({status:'ready',data,readAt:date()});})
     .catch(error=>{if(!abort.signal.aborted)setOrders({status:'error',error:error instanceof Error?error.message:'订单摘要读取失败'});});
   void readAuthorized('/v1/commerce/operations/refund-reviews',abort.signal).then(readRefundFacts)
     .then(data=>{if(!abort.signal.aborted)setRefunds({status:'ready',data,readAt:date()});})
     .catch(error=>{if(!abort.signal.aborted)setRefunds({status:'error',error:error instanceof Error?error.message:'退款审核记录读取失败'});});
   return()=>abort.abort();
 },[refresh]);
 const value=(field:string):string=>{
   if(['第一方订单（全部状态）','内部草稿订单','已提交订单（非支付确认）'].includes(field)){
     if(orders.status==='loading')return '读取中…';
     if(orders.status==='error')return '读取失败';
     if(!orders.data)return '读取失败';
     if(field==='第一方订单（全部状态）')return String(orders.data.total);
     if(field==='内部草稿订单')return String(orders.data.draft);
     return String(orders.data.submitted);
   }
   if(field==='退款审核申请数'){
     if(refunds.status==='loading')return '读取中…';
     if(refunds.status==='error')return '读取失败';
     return refunds.data?String(refunds.data.requests)+(refunds.data.requests>=100?'（前 100 条）':'（当前列表）'):'读取失败';
   }
   return missing;
 };
 return <section className="av-analytics-business" aria-label="经营分析框架">
  <div className="av-analytics-business-intro">
   <h2>经营分析</h2><p>数据只来自 ALSVID 已授权业务接口。真实订单草稿不等于已支付销售，退款审核申请不等于退款成功；未建立可信来源的指标不显示猜测数字。</p>
   <button className="av-btn" type="button" onClick={reload}>刷新已接入数据</button>
   <p role="status">订单：{orders.status==='ready'?'已读取 '+orders.readAt:orders.status==='error'?'读取失败：'+orders.error:'读取中'}
    {' · '}退款审核：{refunds.status==='ready'?'已读取 '+refunds.readAt:refunds.status==='error'?'读取失败：'+refunds.error:'读取中'}</p>
  </div>
  <div className="av-analytics-business-grid">
   {groups.map(group=><section className="av-card av-analytics-business-card" key={group.title}>
    <h3>{group.title}</h3><p>{group.description}</p>
    <table aria-label={group.title+'指标'}><tbody>
     {group.fields.map(field=><tr key={field}><th scope="row">{field}</th><td>{value(field)}</td></tr>)}
    </tbody></table>
   </section>)}
  </div>
  <section className="av-card">
   <h3>已接入的产品兴趣专题</h3>
   <p>FC1 颜色兴趣统计只能用于观察颜色偏好，不替代全站 UV/PV、销售额或退款率。</p>
   <a className="av-btn" href="/admin/analytics/color-interest">查看 FC1 颜色兴趣分析</a>
  </section>
 </section>;
}
