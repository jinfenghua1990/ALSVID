import test from 'node:test';
import assert from 'node:assert/strict';
import {readOrderFacts,readRefundFacts} from './business-analytics-facts.ts';
import {readFileSync} from 'node:fs';

test('real storefront summary distinguishes drafts from submissions and never invents sales revenue',()=>{
 assert.deepEqual(readOrderFacts({orderTotal:6,orderStatusCounts:{DRAFT:3,SUBMITTED:2,CANCELLED:1}}),
  {total:6,draft:3,submitted:2,other:1});
 assert.throws(()=>readOrderFacts({orderStatusCounts:{}}),/总数/);
 assert.throws(()=>readOrderFacts({orderTotal:5,orderStatusCounts:{DRAFT:7}}),/不一致/);
});
test('refund review list count is not a settled refund figure',()=>{
 assert.deepEqual(readRefundFacts([{id:'review-1'},{id:'review-2'}]),{requests:2});
 assert.throws(()=>readRefundFacts({total:3}),/格式/);
});
test('analytics does not display invented traffic, payment conversion or refund execution',()=>{
 const ui=readFileSync(new URL('./business-analytics-overview.tsx',import.meta.url),'utf8');
 assert.match(ui,/独立访客 UV/);
 assert.match(ui,/支付金额/);
 assert.match(ui,/待接入可信数据源/);
 assert.match(ui,/退款审核申请数/);
 assert.match(ui,/v1\/commerce\/storefront\/summary/);
 assert.match(ui,/v1\/commerce\/operations\/refund-reviews/);
 assert.doesNotMatch(ui,/Math\.random|mockRevenue|fakeUV/);
});
