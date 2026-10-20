import assert from 'node:assert/strict';
import test from 'node:test';
import type {DatabasePort} from '@alsvid/database';
import type {CommerceAuditPort} from './application/ports.js';
import {CommerceValidationError} from './core/errors.js';
import {calculateStorefrontLineTotals,StorefrontOrderService} from './storefront-orders.js';

test('gross-inclusive tax uses integer cents and the configured market tax basis points',()=>{
 assert.deepEqual(calculateStorefrontLineTotals('119.00',1,1900),
  {lineNetAmount:'100.00',lineTaxAmount:'19.00',lineGrossAmount:'119.00'});
 assert.deepEqual(calculateStorefrontLineTotals('10.00',2,2000),
  {lineNetAmount:'16.67',lineTaxAmount:'3.33',lineGrossAmount:'20.00'});
 assert.throws(()=>calculateStorefrontLineTotals('10.00',0,1900),CommerceValidationError);
 assert.throws(()=>calculateStorefrontLineTotals('10.00',1,10001),CommerceValidationError);
});

test('storefront operations require explicit permissions before touching storage',async()=>{
 const db={} as DatabasePort;
 const audit={record:async()=>{}} as unknown as CommerceAuditPort;
 const service=new StorefrontOrderService(db,audit);
 await assert.rejects(service.summary({userId:'u',permissions:[]}),{code:'COMMERCE_FORBIDDEN'});
 await assert.rejects(service.createPrice({userId:'u',permissions:[]},{
  skuId:'11111111-1111-4111-8111-111111111111',marketCountry:'DE',unitPriceGross:'100.00',taxRateBasisPoints:1900,
 }),{code:'COMMERCE_FORBIDDEN'});
 await assert.rejects(service.createPrice({userId:'u',permissions:['commerce.price.manage']},{
  skuId:'11111111-1111-4111-8111-111111111111',marketCountry:'DE',unitPriceGross:'100.00',taxRateBasisPoints:10001,
 }),{code:'COMMERCE_VALIDATION'});
 await assert.rejects(service.createDraftOrder({userId:'u',permissions:[]},{
  clientRequestId:'22222222-2222-4222-8222-222222222222',customerEmail:'customer@example.com',
  marketCountry:'DE',items:[{skuId:'11111111-1111-4111-8111-111111111111',quantity:1}],
 }),{code:'COMMERCE_FORBIDDEN'});
});
