import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const input=readFileSync(new URL('./route.ts',import.meta.url),'utf8');
const js=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function load({apiBase='https://api.test/api',upstream}={}) {
 const mod={exports:{}},calls=[];
 runInNewContext(js,{module:mod,exports:mod.exports,URL,AbortSignal,
  process:{env:{ALSVID_API_BASE_URL:apiBase}},
  require:(name)=>{
   if(name==='next/server')return {NextResponse:{json:(body,{status=200}={})=>({body,status})}};
   throw Error('Unexpected import '+name);
  },
  fetch:async(url,options)=>{calls.push({url,options});if(upstream==='down')throw Error('down');
   return {status:201,json:async()=>({data:{received:true,reference:'id'}})};
  },
 });
 return {POST:mod.exports.POST,calls};
}
function req(data,origin='https://www.alsvidbike.com') {
 return new Request('https://www.alsvidbike.com/api/public/dealer-application',{
  method:'POST',headers:{origin,'content-type':'application/json'},body:data,
 });
}
test('cross-origin and invalid bodies cannot reach API',async()=>{
 const m=load();
 assert.equal((await m.POST(req('{}','https://evil.test'))).status,403);
 assert.equal((await m.POST(req('{bad'))).status,400);
 assert.equal((await m.POST(req(JSON.stringify({stuff:'x'.repeat(4100)})))).status,413);
 assert.equal(m.calls.length,0);
});
test('successful applications are forwarded; outage is never reported as success',async()=>{
 const good=JSON.stringify({companyName:'Example',email:'example@test.com'});
 const m=load();
 const result=await m.POST(req(good));
 assert.equal(result.status,201);assert.equal(result.body.data.received,true);
 assert.equal(m.calls[0].url,'https://api.test/api/v1/public/dealer-applications');
 assert.equal(m.calls[0].options.method,'POST');
 const bad=load({upstream:'down'});
 assert.equal((await bad.POST(req(good))).status,503);
});
