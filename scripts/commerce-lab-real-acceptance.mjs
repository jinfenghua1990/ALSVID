import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

assert.equal(process.env.GITHUB_ACTIONS,'true','Acceptance runs only on disposable GitHub Actions runners');
const base='http://127.0.0.1:8080';
const compose=['compose','-p','alsvid-ci','-f','infra/docker-compose.test.yml','-f','infra/docker-compose.commerce-acceptance.yml'];
const report={sha:process.env.GITHUB_SHA,scope:'Real CI images, gateway, session login, API, audit and disposable PostgreSQL; not Production acceptance.',checks:[]};
const guard=[
  "import assert from 'node:assert/strict';",
  "assert.equal(process.env.NODE_ENV,'test');",
  "const target=new URL(process.env.DATABASE_URL??'');",
  "assert.equal(target.hostname,'postgres');",
  "assert.equal(target.pathname,'/alsvid_test');",
  "assert.equal(target.username,'alsvid_test');",
  "const {database,identityService}=await import('./dist/runtime.js');"
].join('\n');
function runtime(code,args=[]){
  return execFileSync('docker',[...compose,'exec','-T','api','node','--input-type=module','-e',guard+'\n'+code,...args],
    {encoding:'utf8',maxBuffer:1024*1024,timeout:30000}).trim();
}
async function request(path,method='GET',body,cookie,origin=base){
  return fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(15000),
    headers:{...(cookie?{cookie}:{}),...(method==='GET'?{}:{origin,'content-type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function expect(response,status,label){
  assert.equal(response.status,status,label+' must return '+status);
  return response.json();
}
async function ready(){
  for(let attempt=0;attempt<40;attempt++){
    try{
      const api=await request('/api/health');
      const web=await request('/zh/shop-preview');
      if(api.ok&&web.ok)return;
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw Error('Real CI API/Web did not become ready');
}
function persisted(id){
  return JSON.parse(runtime("try { const r=await database.query('SELECT id,code,title,status,version,proposed_price_minor,created_by FROM commerce_lab.catalog_products WHERE id=$1',[process.argv[1]]); console.log(JSON.stringify(r.rows[0])); } finally { await database.close(); }",[id]));
}
async function publicPage(){
  return (await expect(await request('/api/v1/commerce-lab/public/products'),200,'public catalog')).data;
}
const code='REAL-ACCEPTANCE-CI';
try{
  await ready();
  runtime("try { await identityService.bootstrapAdmin('catalog-ci@example.test','EphemeralCatalog123!','CI catalog acceptance'); } finally { await database.close(); }");
  const login=await request('/api/session/login','POST',{email:'catalog-ci@example.test',password:'EphemeralCatalog123!',portal:'admin'});
  assert.equal(login.status,200,'real password login succeeds');
  const user=(await login.json()).data;
  assert.ok(user.roles.includes('system_admin'));
  assert.ok(user.permissions.includes('commerce.read')&&user.permissions.includes('commerce.map'));
  const setCookie=login.headers.getSetCookie().find(value=>value.startsWith('alsvid_session='));
  assert.ok(setCookie&&/httponly/i.test(setCookie),'Web login sets an HTTP-only internal session');
  const cookie=setCookie.split(';')[0];
  await expect(await request('/api/session/password','POST',{password:'EphemeralCatalogUpdated123!',portal:'admin'},cookie),201,'normal password setup');
  const editor=await request('/admin/commerce-lab/catalog','GET',undefined,cookie);
  assert.equal(editor.status,200,'real signed-in Admin can load the catalog editor');
  assert.match(await editor.text(),/CRMEB 商品管理适配版/);
  report.checks.push('real Identity bootstrap on guarded disposable database, normal password login/setup, HTTP-only Web cookie, authenticated Admin page');

  assert.equal((await publicPage()).total,0);
  const fields={title:{zh:'真实链路 CI 商品',de:'Realer CI Vergleich',en:'Real CI comparison'},
    description:{zh:'仅临时验收数据',de:'Nur temporäre Testdaten',en:'Disposable acceptance data only'},
    referenceImage:'FC1',proposedPriceMinor:259900};
  const wrongPort=await request('/admin/commerce-lab/api/products','POST',{code:'WRONG-PORT-CI',...fields},cookie,'http://127.0.0.1');
  assert.equal(wrongPort.status,403,'origin without the gateway port is a different origin');
  const created=await expect(await request('/admin/commerce-lab/api/products','POST',{code,...fields},cookie),201,'create through real authenticated Web proxy');
  const id=created.data.id;
  assert.match(id,/^[a-f0-9-]{36}$/i);
  let row=persisted(id);
  assert.equal(row.code,code);assert.equal(row.status,'DRAFT');assert.equal(row.version,1);
  assert.equal(row.created_by,user.userId);assert.equal(row.proposed_price_minor,259900);
  assert.equal((await publicPage()).total,0,'persisted drafts are not public');
  report.checks.push('authenticated BFF create reaches actual PostgreSQL with the real actor; draft stays private');

  const patch=async(value)=>expect(await request('/admin/commerce-lab/api/products/'+id,'PATCH',value,cookie),200,'real catalog update');
  await patch({...fields,status:'PUBLISHED',expectedVersion:1});
  assert.equal(persisted(id).status,'PUBLISHED');
  let publicRows=await publicPage();
  assert.equal(publicRows.total,1);assert.equal(publicRows.items[0].id,id);
  assert.ok(!('createdBy' in publicRows.items[0])&&!('created_by' in publicRows.items[0]));
  for(const locale of ['zh','de','en']){
    const html=await (await request('/'+locale+'/shop-preview')).text();
    assert.ok(html.includes('data-state="connected"')&&html.includes('data-comparison-product="'+id+'"'),locale+' SSR reads actual published PostgreSQL product');
    assert.ok(html.includes(fields.title[locale]));
  }
  const updated={...fields,title:{...fields.title,zh:'真实链路 CI 已更新',en:'Real CI updated'}};
  await patch({...updated,status:'PUBLISHED',expectedVersion:2});
  assert.equal(persisted(id).title.zh,updated.title.zh);
  assert.ok((await (await request('/zh/shop-preview')).text()).includes(updated.title.zh));
  const stale=await request('/admin/commerce-lab/api/products/'+id,'PATCH',{...fields,status:'PUBLISHED',expectedVersion:1},cookie);
  assert.equal(stale.status,409);assert.equal(persisted(id).version,3);
  const csrf=await request('/admin/commerce-lab/api/products','POST',{code:'UNTRUSTED-CI',...fields},cookie,'https://untrusted.invalid');
  assert.equal(csrf.status,403);
  const anonymous=await request('/admin/commerce-lab/api/products','POST',{code:'ANON-CI',...fields});
  assert.equal(anonymous.status,401);
  report.checks.push('publication and edit reflected by real API and three-locale SSR; stale write 409, foreign-origin 403 and anonymous 401');

  execFileSync('docker',[...compose,'restart','api'],{stdio:'pipe',timeout:60000});
  await ready();
  const reloaded=(await expect(await request('/admin/commerce-lab/api/products','GET',undefined,cookie),200,'reload after API restart')).data;
  assert.equal(reloaded.items.find(item=>item.id===id).version,3);
  await patch({...updated,status:'DRAFT',expectedVersion:3});
  assert.equal((await publicPage()).total,0);
  assert.ok(!(await (await request('/zh/shop-preview')).text()).includes('data-comparison-product="'+id+'"'));
  const evidence=JSON.parse(runtime("try { const a=await database.query('SELECT action FROM audit.events WHERE target_type=$1 AND target_id=$2 ORDER BY occurred_at',['commerce_lab.catalog_product',process.argv[1]]); const p=await database.query('SELECT count(*)::int AS count FROM product.models WHERE code=$1',[process.argv[2]]); console.log(JSON.stringify({actions:a.rows.map(r=>r.action),originalProductCount:p.rows[0].count})); } finally { await database.close(); }",[id,code]));
  assert.equal(evidence.actions.filter(value=>value==='commerce.lab.product_created').length,1);
  assert.equal(evidence.actions.filter(value=>value==='commerce.lab.product_updated').length,3);
  assert.equal(evidence.originalProductCount,0);
  report.checks.push('catalog and session persist across actual API restart; withdrawal reaches public SSR; real audit rows recorded; original Product table not written');
  report.result='passed';
}catch(error){
  report.result='failed';report.failure=error.message;
  throw error;
}finally{
  await mkdir('.tmp',{recursive:true});
  await writeFile('.tmp/commerce-lab-real-acceptance.json',JSON.stringify(report,null,2));
}
