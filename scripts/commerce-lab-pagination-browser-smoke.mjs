import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

assert.equal(process.env.GITHUB_ACTIONS,'true','Browser fixtures run only on disposable CI');
const require=createRequire(path.join(process.env.FC1_PLAYWRIGHT_ROOT,'package.json'));
const {chromium}=require('playwright');
const base='http://127.0.0.1:3000',output=process.env.FC1_REVIEW_OUTPUT||'.tmp/fc1-v4-review';
const items=Array.from({length:105},(_,index)=>{
  const n=String(index+1).padStart(3,'0');
  return {id:'00000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),code:'BIKE-'+n,
    title:{zh:'车型 '+n,de:'Modell '+n,en:'Model '+n},description:{zh:'',de:'',en:''},
    specifications:[],referenceImage:null,proposedPriceMinor:null,currency:'EUR',status:'PUBLISHED',version:1,
    hasCustomImage:false,updatedAt:'2026-10-26T00:00:00Z'};
});
let failSelection=false,selectionRequests=0,heldId='',releaseHeld,markHeldStarted;
let heldStarted=Promise.resolve();
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:4000');
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(url.pathname==='/api/v1/commerce-lab/public/products'){
    const query=(url.searchParams.get('query')||'').toLowerCase();
    const page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||20);
    const found=items.filter(row=>row.status==='PUBLISHED'&&
      (row.code+' '+Object.values(row.title).join(' ')).toLowerCase().includes(query));
    return send(200,{data:{items:found.slice((page-1)*limit,page*limit),total:found.length,page,limit}});
  }
  const prefix='/api/v1/commerce-lab/public/products/';
  if(url.pathname.startsWith(prefix)){
    selectionRequests++;
    if(failSelection)return send(503,{message:'temporary error'});
    const row=items.find(item=>item.id===url.pathname.slice(prefix.length)&&item.status==='PUBLISHED');
    if(row&&row.id===heldId){markHeldStarted();releaseHeld=()=>send(200,{data:row});return;}
    return row?send(200,{data:row}):send(404,{message:'not found'});
  }
  send(404,{message:'not found'});
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4000,'127.0.0.1',resolve);});
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const report={sha:process.env.FC1_REVIEW_SHA,checks:[]};
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/zh/shop-preview');
  await page.locator('[data-database-catalog][data-state="connected"]').waitFor();
  assert.equal(await page.locator('[data-comparison-product]').count(),20,'only one bounded page is rendered');
  await page.screenshot({path:path.join(output,'comparison-pagination-desktop.png')});
  await page.getByRole('button',{name:'加入本页预览袋',exact:true}).first().click();
  await page.getByRole('navigation',{name:'商品分页'}).getByRole('link',{name:'下一页'}).click();
  await page.waitForURL(url=>url.searchParams.get('page')==='2');
  assert.equal(await page.locator('[data-comparison-product]').count(),20);
  await page.getByRole('button',{name:'本页预览袋（1）'}).click();
  await page.locator('#database-comparison-bag').getByText('车型 001',{exact:true}).waitFor();
  assert.ok(selectionRequests>0,'cross-page selection reads the published product independently');
  report.checks.push('bounded pagination retains the preview bag and resolves a published product from another page');

  await page.getByRole('search').getByRole('searchbox').fill('BIKE-105');
  await page.getByRole('search').getByRole('button',{name:'搜索',exact:true}).click();
  await page.waitForURL(url=>url.searchParams.get('q')==='BIKE-105');
  assert.equal(await page.locator('[data-comparison-product]').count(),1);
  await page.getByTestId('product-title').filter({hasText:'车型 105'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'本页预览袋（1）'}).count(),1);
  report.checks.push('search reaches a published product beyond the first 100');

  await page.goto(base+'/de/shop-preview?page=6');
  await page.locator('[data-database-catalog][data-state="connected"]').waitFor();
  assert.equal(await page.locator('[data-comparison-product]').count(),5);
  await page.getByRole('navigation',{name:'Produktseiten'}).getByText('Seite 6 von 6',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Diese Vorschautasche (1)'}).click();
  await page.locator('#database-comparison-bag').getByText('Modell 001',{exact:true}).waitFor();
  report.checks.push('last page and cross-page selections work in German');

  failSelection=true;
  await page.goto(base+'/zh/shop-preview?page=2');
  await page.getByRole('button',{name:'本页预览袋（1）'}).click();
  await page.locator('#database-comparison-bag').getByText('所选商品当前不可用，请刷新核对',{exact:true}).waitFor();
  assert.equal(await page.locator('#database-comparison-bag').getByRole('button',{name:'移除',exact:true}).count(),1,'temporary lookup errors keep selections removable');
  failSelection=false;items[0].status='DRAFT';
  await page.reload();
  await page.getByRole('button',{name:'本页预览袋（1）'}).click();
  await page.locator('#database-comparison-bag').getByText('所选商品当前不可用，请刷新核对',{exact:true}).waitFor();
  const removed=await context.request.get(base+'/shop-preview/selection/'+items[0].id);
  assert.equal(removed.status(),404,'withdrawn product details are not exposed by the selection endpoint');
  await page.locator('#database-comparison-bag').getByRole('button',{name:'移除',exact:true}).click();
  await page.getByRole('button',{name:'本页预览袋（0）'}).waitFor();
  report.checks.push('temporary failures preserve selections; withdrawal closes lookup and leaves the item removable');

  await page.goto(base+'/en/shop-preview?page=9999');
  await page.getByText('There are no products on this page. Please go back.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'Product pages'}).getByRole('link',{name:'Previous'}).count(),1);
  await page.goto(base+'/en/shop-preview?page=0');
  await page.locator('[data-database-catalog][data-state="connected"]').waitFor();
  assert.equal(await page.locator('[data-comparison-product]').count(),20,'invalid page falls back to the first page');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pagination fits mobile');
  await page.screenshot({path:path.join(output,'comparison-pagination-mobile.png')});
  await page.getByRole('navigation',{name:'Product pages'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'comparison-pagination-mobile-nav.png')});
  report.checks.push('out-of-range and invalid pages are recoverable and pagination fits mobile');

  const secondContext=await browser.newContext({viewport:{width:1440,height:1000}}),secondPage=await secondContext.newPage();
  secondPage.on('pageerror',error=>errors.push(error.message));
  await secondPage.goto(base+'/zh/shop-preview');
  await secondPage.locator('[data-comparison-product]').first().waitFor();
  await secondPage.getByRole('button',{name:'加入本页预览袋',exact:true}).nth(0).click();
  await secondPage.getByRole('button',{name:'加入本页预览袋',exact:true}).nth(1).click();
  await secondPage.getByRole('navigation',{name:'商品分页'}).getByRole('link',{name:'下一页'}).click();
  heldId=items[1].id;heldStarted=new Promise(resolve=>{markHeldStarted=resolve;});
  await secondPage.getByRole('button',{name:'本页预览袋（2）'}).click();
  await heldStarted;
  const secondBag=secondPage.locator('#database-comparison-bag');
  await secondBag.getByText('车型 003',{exact:true}).waitFor({timeout:5000});
  assert.equal(await secondBag.getByText('正在核对所选商品…',{exact:true}).count(),1,'one slow lookup does not hide the completed result');
  releaseHeld();
  await secondBag.getByText('车型 002',{exact:true}).waitFor();

  await secondBag.getByRole('button',{name:'关闭',exact:true}).click();
  heldStarted=new Promise(resolve=>{markHeldStarted=resolve;});
  await secondPage.getByRole('button',{name:'本页预览袋（2）'}).click();
  await heldStarted;
  await secondBag.getByText('车型 003',{exact:true}).waitFor({timeout:5000});
  await secondBag.getByText('所选商品当前不可用，请刷新核对',{exact:true}).waitFor({timeout:12000});
  assert.equal(await secondBag.getByRole('button',{name:'移除',exact:true}).count(),2,'timed-out selections are retained');
  releaseHeld();
  heldId='';
  await secondContext.close();
  report.checks.push('slow selections do not block other names, and timed-out selections remain removable');
  assert.deepEqual(errors,[]);
  await writeFile(path.join(output,'comparison-pagination-browser-report.json'),JSON.stringify(report,null,2));
  await context.close();
}catch(error){
  report.failure=error.message;
  await writeFile(path.join(output,'comparison-pagination-browser-report.json'),JSON.stringify(report,null,2));
  throw error;
}finally{
  await browser.close();server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
