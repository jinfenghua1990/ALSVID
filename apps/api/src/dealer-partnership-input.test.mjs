import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('./dealer-partnership-input.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
runInNewContext(js,{module:mod,exports:mod.exports,URL});
const {normalizeDealerApplication,publicDealerLocation}=mod.exports;
const sample=()=>({clientRequestId:'5275ec5b-85ef-4b5c-969a-c43897d1d7f1',companyName:'  Bike Händler  ',
 contactName:' Ada ',email:' ADA@EXAMPLE.COM ',country:'DE',partnershipType:'retail',locale:'de',
 consent:true,nickname:'',website:'https://example.com',message:'Hello'});
test('valid dealer application is normalized and has consent',()=>{
 const v=normalizeDealerApplication(sample());
 assert.equal(v.companyName,'Bike Händler');assert.equal(v.email,'ada@example.com');
 assert.equal(v.country,'DE');assert.equal(v.website,'https://example.com/');
});
test('rejects invalid, oversized, injected, unconsented or spam submissions',()=>{
 for(const v of [null,{},[],'a',{...sample(),consent:false},
  {...sample(),email:'a@b.com\nBcc:evil'},
  {...sample(),website:'javascript:alert(1)'},{...sample(),website:'https://u:pass@example.com'},
  {...sample(),nickname:'spam'}, {...sample(),companyName:'x'.repeat(161)},
  {...sample(),message:'x'.repeat(1601)}, {...sample(),country:'??'},
  {...sample(),partnershipType:'unknown'}, {...sample(),clientRequestId:'not-uuid'},
  {...sample(),contactName:'a'}, {...sample(),locale:'fr'}])
  assert.equal(normalizeDealerApplication(v),null);
});
test('public location projection excludes private contacts',()=>{
 const result=publicDealerLocation({id:'loc-1',display_name:'DEMO',country_code:'AT',
  city:'Vienna',address:'Test 1',sales_authorized:true,service_authorized:false,private_email:'secret@test.com'});
 assert.equal(result.sales,true);assert.equal(result.service,false);assert.equal(result.private_email,undefined);
});
