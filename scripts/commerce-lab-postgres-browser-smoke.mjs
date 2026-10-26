import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(path.join(process.env.FC1_PLAYWRIGHT_ROOT,'package.json'));
const {chromium}=require('playwright');
const base='http://127.0.0.1:3000',output=process.env.FC1_REVIEW_OUTPUT||'.tmp/fc1-v4-review';
const token='isolated-commerce-lab-browser-session';
const records=new Map();let writes=0;
const id='00000000-0000-4000-8000-000000000001';
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:4000');
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(url.pathname==='/api/v1/auth/me'){
    return req.headers.authorization==='Bearer '+token?send(200,{data:{
      userId:'00000000-0000-4000-8000-000000000099',email:'comparison-browser@example.test',displayName:'Comparison CI',
      roles:['system_admin'],permissions:['commerce.read','commerce.map'],passwordSetupRequired:false
    }}):send(401,{message:'unauthorized'});
  }
  if(url.pathname==='/api/v1/commerce-lab/public/products'){
    const items=[...records.values()].filter(row=>row.status==='PUBLISHED');
    return send(200,{data:{items,total:items.length,page:1,limit:100}});
  }
  if(url.pathname.startsWith('/api/v1/commerce-lab/products')){
    if(req.headers.authorization!=='Bearer '+token)return send(401,{message:'unauthorized'});
    if(req.method==='GET'&&url.pathname!=='/api/v1/commerce-lab/products'){
      const row=records.get(url.pathname.split('/').pop());
      return row?send(200,{data:row}):send(404,{message:'not found'});
    }
    if(req.method==='GET'){
      const q=(url.searchParams.get('query')||'').toLowerCase();
      const items=[...records.values()].filter(row=>(row.code+' '+row.title.zh).toLowerCase().includes(q));
      return send(200,{data:{items,total:items.length,page:1,limit:20}});
    }
    let raw='';for await(const chunk of req)raw+=chunk;
    const body=JSON.parse(raw||'{}');
    if(req.method==='POST'){
      const row={...body,id,status:'DRAFT',currency:'EUR',version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      records.set(id,row);writes++;return send(201,{data:row});
    }
    if(req.method==='PATCH'){
      const current=records.get(id);
      if(!current||body.expectedVersion!==current.version)return send(409,{message:'stale version'});
      const row={...current,...body,version:current.version+1,updatedAt:new Date().toISOString()};
      delete row.expectedVersion;records.set(id,row);writes++;return send(200,{data:row});
    }
  }
  send(404,{message:'not found'});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4000,'127.0.0.1',resolve);});
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),report={sha:process.env.FC1_REVIEW_SHA,
  scope:'Browser integration uses isolated API fixtures; PostgreSQL persistence/authorization/audit invariants are separately tested by the commerce domain integration suite.',
  checks:[]};
try{
  const buyer=await browser.newContext({viewport:{width:1440,height:1000}});
  const shop=await buyer.newPage(),buyerWrites=[],errors=[];
  shop.on('pageerror',error=>errors.push(error.message));
  shop.on('request',request=>{if(['POST','PUT','PATCH','DELETE'].includes(request.method()))buyerWrites.push(request.url());});
  await shop.goto(base+'/zh/shop-preview');
  await shop.locator('[data-database-catalog][data-state="connected"]').waitFor();
  assert.equal(await shop.locator('[data-comparison-product]').count(),0);
  const anon=await buyer.request.post(base+'/admin/commerce-lab/api/products',{headers:{origin:base},data:{}});
  assert.equal(anon.status(),401);

  const admin=await browser.newContext({viewport:{width:1440,height:1100}});
  await admin.addCookies([{name:'alsvid_session',value:token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
  const page=await admin.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/admin/commerce-lab');
  await page.getByRole('navigation',{name:'一级导航',exact:true}).getByRole('link',{name:'商城方案对比',exact:true}).waitFor();
  await page.getByRole('complementary',{name:'二级导航',exact:true}).getByRole('link',{name:'独立商品管理',exact:true}).click();
  await page.waitForURL(base+'/admin/commerce-lab/catalog');
  const frame=page.frameLocator('iframe[title="CRMEB 商品管理适配版"]');
  await frame.getByRole('heading',{name:'独立商城商品管理',exact:true}).waitFor();
  assert.equal(await page.locator('.av-pagehead').count(),0,'embedded editor owns its page heading');
  assert.equal(await frame.getByRole('heading',{name:'独立商城商品管理',exact:true}).count(),1);
  assert.equal(await page.getByText('设计页面 / 流程预览 · 0',{exact:true}).count(),0);
  await frame.getByRole('button',{name:'添加实验商品',exact:true}).click();
  async function expectWrite(button,method,status){
    const response=page.waitForResponse(response=>new URL(response.url()).pathname.startsWith('/admin/commerce-lab/api/products')&&response.request().method()===method);
    await frame.getByRole('button',{name:button,exact:true}).click();
    assert.equal((await response).status(),status,'native editor write succeeds');
    if(button==='保存')await frame.locator('.el-dialog__wrapper').waitFor({state:'hidden'});
  }
  async function fill(label,value){
    await frame.locator('.el-dialog__body .el-form-item').filter({hasText:label}).getByRole('textbox').fill(value);
  }
  await fill('实验编码（保存后固定）','FC1-BROWSER-CI');
  await fill('中文名称（必填）','ALSVID FC1 原生联动');
  await fill('德语名称（必填）','ALSVID FC1 Vergleich');
  await fill('英语名称（必填）','ALSVID FC1 comparison');
  await fill('中文说明','独立实验商品，不是真实可售承诺。');
  await fill('德语说明','Unverbindliches Vergleichsprodukt.');
  await fill('英语说明','Independent comparison product.');
  await fill('方案价 EUR（可留空）','2599.00');
  await frame.locator('.el-dialog__body .el-form-item').filter({hasText:'参考图片'}).locator('.el-select').click();
  await frame.getByText('FC1 参考图',{exact:true}).click();
  await expectWrite('保存','POST',201);
  assert.equal(records.get(id).status,'DRAFT');
  assert.equal(records.get(id).proposedPriceMinor,259900);
  await shop.reload();await shop.locator('[data-database-catalog]').waitFor();
  assert.equal(await shop.locator('[data-comparison-product]').count(),0,'drafts stay private');
  const popupPromise=admin.waitForEvent('page');
  await frame.getByRole('link',{name:'预览',exact:true}).click();
  const preview=await popupPromise;preview.on('pageerror',error=>errors.push(error.message));
  await preview.locator('[data-private-product-preview][data-status="DRAFT"]').waitFor();
  assert.match(await preview.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
  assert.equal(await preview.getByRole('complementary',{name:'二级导航',exact:true}).getByRole('link',{name:'独立商品管理',exact:true}).getAttribute('aria-current'),'page');
  for(const [language,locale] of [['中文','zh'],['德语','de'],['英语','en']]){
    await preview.getByRole('navigation',{name:'预览语言',exact:true}).getByRole('link',{name:language,exact:true}).click();
    await preview.getByTestId('product-title').filter({hasText:records.get(id).title[locale]}).waitFor();
  }
  assert.equal(records.get(id).status,'DRAFT','preview does not publish');
  assert.equal(writes,1,'private preview is read-only');
  await preview.screenshot({path:path.join(output,'postgres-commerce-draft-preview-desktop.png'),fullPage:true});
  await preview.setViewportSize({width:390,height:844});
  await preview.screenshot({path:path.join(output,'postgres-commerce-draft-preview-mobile.png'),fullPage:true});
  assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'private preview fits mobile');
  const anonPreview=await buyer.request.get(base+'/admin/commerce-lab/catalog/'+id+'/preview',{maxRedirects:0});
  assert.equal(anonPreview.status(),307,'private preview stays behind Admin login');
  await preview.close();
  report.checks.push('private saved draft preview uses the storefront card in three locales, is read-only and protected, and retains catalog navigation');
  await expectWrite('发布','PATCH',200);
  await shop.reload();await shop.locator('[data-comparison-product]').waitFor();
  assert.equal(await shop.getByTestId('product-title').innerText(),'ALSVID FC1 原生联动');

  await frame.getByRole('button',{name:'编辑',exact:true}).click();
  await fill('中文名称（必填）','ALSVID FC1 已更新');
  await fill('英语名称（必填）','ALSVID FC1 updated');
  await expectWrite('保存','PATCH',200);
  assert.equal(records.get(id).version,3);
  await page.reload();
  await frame.getByText('ALSVID FC1 已更新',{exact:true}).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'一级导航',exact:true}).getByRole('link',{name:'商城方案对比',exact:true}).getAttribute('aria-current'),'page');
  assert.equal(await page.getByRole('complementary',{name:'二级导航',exact:true}).getByRole('link',{name:'独立商品管理',exact:true}).getAttribute('aria-current'),'page');
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.screenshot({path:path.join(output,'postgres-commerce-admin-desktop.png'),fullPage:true});

  const prior=writes;
  const csrf=await admin.request.post(base+'/admin/commerce-lab/api/products',{headers:{origin:'https://untrusted.invalid'},data:{}});
  assert.equal(csrf.status(),403);assert.equal(writes,prior);
  const stale=await admin.request.patch(base+'/admin/commerce-lab/api/products/'+id,{headers:{origin:base},
    data:{title:records.get(id).title,description:records.get(id).description,referenceImage:'FC1',
      proposedPriceMinor:259900,status:'PUBLISHED',expectedVersion:1}});
  assert.equal(stale.status(),409);assert.equal(writes,prior);
  report.checks.push('native Vue/Element UI editor; authenticated proxy; create/draft/private/publication/edit/reload; integer money; CSRF and stale-write refusal');

  for(const locale of ['zh','de','en']){
    const copy=JSON.parse(await readFile('apps/web/app/_lib/i18n/shop-preview/'+locale+'.json','utf8'));
    await shop.goto(base+'/'+locale+'/shop-preview');
    await shop.locator('[data-comparison-product]').waitFor();
    assert.equal(await shop.getByTestId('product-title').innerText(),records.get(id).title[locale]);
    assert.match(await shop.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
    assert.equal(await shop.locator('[data-public-site-header]').count(),1);
    const oldStorage=await shop.evaluate(()=>JSON.stringify({...localStorage}));
    await shop.getByRole('button',{name:copy['shopPreview.add'],exact:true}).click();
    const count=(locale==='zh'?1:locale==='de'?2:3);
    await shop.getByRole('button',{name:copy['shopPreview.bag'].replace('{count}',String(count)),exact:true}).click();
    assert.equal(await shop.locator('#database-comparison-bag').getByRole('button',{name:copy['shopPreview.noCheckout'],exact:true}).isDisabled(),true);
    assert.equal(await shop.evaluate(()=>JSON.stringify({...localStorage})),oldStorage);
    await shop.screenshot({path:path.join(output,'postgres-commerce-'+locale+'-desktop.png'),fullPage:true});
    await shop.setViewportSize({width:390,height:844});
    await shop.screenshot({path:path.join(output,'postgres-commerce-'+locale+'-mobile.png'),fullPage:true});
    assert.ok(await shop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),locale+' fits mobile');
    await shop.setViewportSize({width:1440,height:1000});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.screenshot({path:path.join(output,'postgres-commerce-admin-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Admin page fits mobile');
  assert.ok(await frame.locator('html').evaluate(element=>element.scrollWidth<=innerWidth+1),'native editor fits mobile');
  await expectWrite('下架','PATCH',200);
  await shop.reload();await shop.locator('[data-database-catalog]').waitFor();
  assert.equal(await shop.locator('[data-comparison-product]').count(),0,'withdrawal becomes visible after refresh');
  assert.deepEqual(buyerWrites,[],'buyer comparison never creates real orders');
  assert.deepEqual(errors,[]);
  report.checks.push('three locales; public refresh reflects saved changes; independent bag; no live checkout; withdrawal; mobile desktop; no original localStorage writes');
  await writeFile(path.join(output,'postgres-commerce-browser-report.json'),JSON.stringify(report,null,2));
  await admin.close();await buyer.close();
}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
