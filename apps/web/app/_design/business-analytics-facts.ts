/** Strict projections: missing data must be reported unavailable, not a fabricated zero. */
type OrderFacts={total:number;draft:number;submitted:number;other:number};
type RefundFacts={requests:number};
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

