import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const root=process.env.FC1_PLAYWRIGHT_ROOT;
if(!root)throw Error('FC1_PLAYWRIGHT_ROOT required');
const {chromium}=createRequire(root+'/package.json')('playwright');
const base=(process.env.FC1_REVIEW_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const out=process.env.FC1_REVIEW_OUTPUT||'.tmp/fc1-v4-review';
await mkdir(out,{recursive:true});
const report={checks:[],errors:[]};
const browser=await chromium.launch();
try{
 for(const locale of ['de','en','zh']){
  for(const [device,viewport] of [['desktop',{width:1440,height:900}],
                                  ['mobile',{width:390,height:844}],
                                  ['small',{width:320,height:720}]]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});
   try{
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(base+'/'+locale+'/dealers',{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200,locale+' dealer page should exist');
    await page.getByRole('heading',{level:1}).first().waitFor();
    assert.equal(await page.locator('[class*=platformCard]').count(),4);
    assert.ok(await page.locator('a[href="/'+locale+'/dealers/locations"]').count()>=1);
    assert.ok(await page.locator('header a[href="https://dealer.alsvidbike.com"]').count()>=1,'dealer portal login included in shared header');
    assert.equal(await page.locator('header[data-public-site-header]').count(),1,'dealer page reuses homepage header');
    assert.ok(await page.locator('header a[href="/'+locale+'/dealers#apply"]').count()>=1,'direct applicant navigation exists');
    assert.equal(await page.locator('header details[class*="switcher"] summary').count(),1,'homepage globe language switcher reused');
    assert.equal(await page.locator('[class*=heroActions] a[href="#apply"]').count(),1,'hero CTA leads to application form');
    assert.equal(await page.locator('[class*=heroActions] a[href="https://dealer.alsvidbike.com"]').count(),1,'existing partners can sign in from hero');
    assert.equal(await page.locator('section[id="apply"] form').count(),1,'applicant form target exists');
    assert.equal(await page.locator('input[name=companyName]').isDisabled(),false,'applicant form enabled');
    assert.equal(await page.locator('select[name=country] option').count(),4);
    assert.equal(await page.locator('details[class*=faqItem]').count(),3);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.alsvidbike.com/'+locale+'/dealers');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),locale+' '+device+' page must not overflow');
    await page.screenshot({path:out+'/dealer-'+locale+'-'+device+'.png',fullPage:true});
    let payload=null;
    await page.route('**/api/public/dealer-application',async route=>{
     payload=route.request().postDataJSON();
     await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({data:{received:true,reference:'demo-ref'}})});
    });
    await page.locator('input[name=companyName]').fill('Example Bicycle Shop');
    await page.locator('select[name=country]').selectOption('DE');
    await page.locator('input[name=contactName]').fill('Demo Contact');
    await page.locator('input[name=email]').fill('test@example.invalid');
    await page.locator('select[name=partnershipType]').selectOption('retail');
    await page.locator('input[name=consent]').check();
    await page.locator('button[type=submit]').click();
    await page.locator('[role=status]').waitFor();
    assert.equal(payload?.locale,locale);
    assert.equal(payload?.email,'test@example.invalid');
    assert.equal(payload?.consent,true);
    assert.deepEqual(errors,[]);
    report.checks.push(locale+' '+device+': dealer CTA, form submission mock, locales, FAQ, viewport');
   }finally{await context.close();}
  }
  // Reuse and locale-check the identical public-site header across the entire WWW.
  for(const route of ['/','/bikes','/accessories','/explore/fc1','/explore/fc2','/explore/about-story']) {
   for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    try {
     const page=await context.newPage();
     const response=await page.goto(base+'/'+locale+route,{waitUntil:'domcontentloaded'});
     assert.equal(response?.status(),200,locale+route+' must load');
     assert.equal(await page.locator('header[data-public-site-header]').count(),1,locale+route+' must share header');
     assert.equal(await page.locator('header details[class*="switcher"] summary').count(),1,'globe language switcher');
     assert.ok(await page.locator('header a[href="/'+locale+'/bikes"]').count()>=1,'shared product link');
     assert.ok(await page.locator('header a[href="/'+locale+'/dealers"]').count()>=1,'shared dealers link');
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),locale+route+' viewport overflow');
     report.checks.push(locale+route+' '+viewport.width+': public nav, globe and layout');
    }finally{await context.close();}
   }
  }
  const context=await browser.newContext();
  try{
   for(const route of ['/dealers/locations','/service-locations']){
    const page=await context.newPage();
    const response=await page.goto(base+'/'+locale+route,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200);
    assert.ok(await page.getByRole('heading',{level:1}).count()>=1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.alsvidbike.com/'+locale+route);
    report.checks.push(locale+route+': directory route and canonical');
    await page.close();
   }
  }finally{await context.close();}
 }
}catch(error){report.errors.push(String(error?.stack||error));throw error;}
finally{await browser.close();await writeFile(out+'/dealer-report.json',JSON.stringify(report,null,2)+'\n');}
