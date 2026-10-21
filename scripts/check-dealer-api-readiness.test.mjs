import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDealerApiReadiness } from './check-dealer-api-readiness.mjs';

const ok = async (url, init) => {
  if (url.includes('dealer-locations')) return { status:200, json:async () => ({ data:[] }) };
  assert.equal(init.method,'POST');
  assert.equal(init.body,'{}');
  return { status:400 };
};
test('API contract passes with empty approved directories and safe invalid enquiry',async()=>{
  assert.equal(await checkDealerApiReadiness('https://api.example.test',ok),true);
});
test('missing URL and insecure URL fail without any requests',async()=>{
  for(const url of ['', 'http://example.test','not-a-url']){
    await assert.rejects(checkDealerApiReadiness(url,ok));
  }
});
test('old API, failed DB migration and malformed projection block Web release',async()=>{
  await assert.rejects(checkDealerApiReadiness('https://api.example.test',async()=>({status:404})),/not ready/);
  await assert.rejects(checkDealerApiReadiness('https://api.example.test',async()=>({status:503})),/not ready/);
  await assert.rejects(checkDealerApiReadiness('https://api.example.test',async()=>({status:200,json:async()=>({error:'wrong'})})),/incompatible/);
});
test('unavailable application API blocks Web even if directory is healthy',async()=>{
  await assert.rejects(checkDealerApiReadiness('https://api.example.test',async(url,init)=>{
    if(!init.method)return {status:200,json:async()=>({data:[]})};
    return {status:404};
  }),/contract mismatch/);
});
