// Import reviewed Ardot UI fixtures. This never writes business data or credentials.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const audit = process.argv[2];
if (!audit) throw new Error('Usage: node scripts/sync-admin-design.cjs <ardot-audit-directory>');
const target = path.resolve(__dirname, '../apps/web/app/_design');
const registry = new Map();
function ingest(node) {
  if (!node || typeof node !== 'object' || !node.id) return;
  const old = registry.get(node.id) || {};
  const incoming = { ...node };
  delete incoming.children;
  const children = Array.isArray(node.children) ? node.children : [];
  const ids = [...new Set([...(old.children || []), ...children.map(n => n.id)])];
  registry.set(node.id, { ...old, ...incoming, children: ids });
  children.forEach(ingest);
}
const files = fs.readdirSync(audit).filter(f => f.endsWith('.jsonl')).sort((a,b) => fs.statSync(path.join(audit,a)).mtimeMs - fs.statSync(path.join(audit,b)).mtimeMs);
for (const file of files) {
  for (const line of fs.readFileSync(path.join(audit,file),'utf8').trim().split(/\r?\n/)) {
    if (!line) continue;
    const value = JSON.parse(line);
    if (value.id) ingest(value);
    if (value.data?.nodes) value.data.nodes.forEach(ingest);
  }
}
// Explicitly reviewed corrections from iteration 27 override older read snapshots.
for (const [id,characters] of Object.entries({'2:4868':'FC1 Pro / 待核对','2:4869':'待核验','2:4872':'审核中','2:5038':'GT1 / 待核对','15:2750':'待核验','19:460':'待核验','15:878':'GT1 / 待核验','15:770':'原入库 仓库 A','15:855':'GT1 / 待核对'})) {
  if (registry.has(id)) registry.get(id).characters = characters;
}
const get = id => registry.get(typeof id === 'string' ? id : id.id);
const kids = n => (get(n)?.children || []).map(get).filter(Boolean);
function texts(n, seen = new Set()) {
  n = get(n); if (!n || seen.has(n.id)) return [];
  const next = new Set(seen).add(n.id);
  return n.characters ? [n.characters] : kids(n).flatMap(c => texts(c,next));
}
function find(n,predicate,seen = new Set()) {
  n=get(n); if(!n || seen.has(n.id)) return;
  if(predicate(n)) return n;
  seen.add(n.id); for(const c of kids(n)){const r=find(c,predicate,seen);if(r)return r;}
}
function parsePanel(n) {
  n=get(n); const cs=kids(n); const all=texts(n);
  if(!all.length) return [];
  const heading=cs.find(c=>c.type==='TEXT' && /标题/.test(c.name||'')) || cs.filter(c=>/卡标题/.test(c.name||'')).map(c=>find(c,x=>x.type==='TEXT')).find(Boolean);
  const title=heading?.characters || n.name?.replace(/^(信息卡|卡片)\s*\/\s*/,'') || '页面信息';
  if(/系列卡片组/.test(n.name||''))return [{kind:'platforms',items:cs.filter(c=>c.type==='FRAME').map(c=>{const t=texts(c);return {title:t[0]||c.name,details:t.slice(1)};})}];
  if(/信息行|调拨与经销商行|业务概况|汇总行/.test(n.name||'')) return cs.filter(c=>c.type==='FRAME').flatMap(parsePanel);
  if(/KPI|指标|概况/.test(n.name||'')){
    const items=cs.filter(c=>c.type==='FRAME').map(c=>{
      const values=texts(c);const label=find(c,x=>x.type==='TEXT' && /标签|label|名称/.test(x.name||''))?.characters;
      const value=find(c,x=>x.type==='TEXT' && /数值|value|数量/.test(x.name||''))?.characters;
      return {label:label||values.find(x=>!/[0-9—]/.test(x))||c.name,value:value||values.find(x=>/[0-9—]/.test(x))||'—'};
    });if(items.length)return [{kind:'kpis',items}];
  }
  const inputs=cs.filter(c=>c.type==='FRAME' && /输入/.test(c.name||''));
  if(inputs.length){return [{kind:'form',title,fields:inputs.map(c=>({label:c.name.replace(/输入.*$/,''),value:texts(c).join(' / ')})),hint:cs.filter(c=>/说明/.test(c.name||'')).flatMap(c=>texts(c)).join(' ')}];}
  const header=cs.find(c=>c.name==='表头');
  if(header){
    const columns=kids(header).map(c=>texts(c).join(' / '));
    const rows=cs.filter(c=>c.id!==header.id && /^(行\s*\/|记录|关系记录|数据行)/.test(c.name||'')).map(row=>kids(row).map(c=>texts(c).join(' / ')));
    if(columns.length && rows.length) return [{kind:'table',title,hint:cs.filter(c=>/说明|口径/.test(c.name||'')).flatMap(n=>texts(n)).join(' '),columns,rows:rows.map(r=>columns.map((_,i)=>r[i]||'—'))}];
  }
  if(/操作区|处理操作|结果操作|操作$/.test(n.name||'')) return [];
  const meaningful=cs.filter(c=>!/标题|说明|口径/.test(c.name||'') || c.type!=='TEXT');
  const pairs=meaningful.filter(c=>c.type==='FRAME' && /字段|表单行/.test(c.name||'')).map(c=>texts(c));
  if(pairs.length) {
    const complete=pairs.filter(x=>x.length>1);
    const notes=pairs.filter(x=>x.length===1).map(x=>x[0]);
    return [...(complete.length?[{kind:'form',title,fields:complete.map(x=>({label:x[0],value:x.slice(1).join(' / ')}))}]:[]),...(notes.length?[{kind:'fields',title:complete.length?'状态说明':title,items:notes}]:[])];
  }
  if(cs.filter(c=>c.type==='FRAME').length && (n.name||'').match(/信息行|业务概况|汇总行|指标行/))return cs.flatMap(parsePanel);
  const content=all.filter(x=>x!==heading?.characters);
  return [{kind:'fields',title,items:[...new Set(content)]}];
}
const baseline=[];
for(const name of ['screens-a','screens-b','screens-c']){
  const js=ts.transpileModule(fs.readFileSync(path.join(target,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const sandbox={exports:{}};vm.runInNewContext(js,sandbox);baseline.push(...Object.values(sandbox.exports).flat());
}
const areas=['产品','订单','生产','库存','经销商','客户','售后','供应链','数据','设置'];
const modules=['product','orders','production','inventory','dealers','customers','after-sales','supply','analytics','settings'];
const mainRoots=['2:1729','2:2121','2:2513','2:2905','2:4360','2:4214','2:4068','2:3922','2:3776','2:3630'];
const review=JSON.parse(fs.readFileSync(path.join(audit,'final-iteration27-review.json'),'utf8'));
const slugs=[
 'product/new/platform','product/new/model','product/new/configuration','product/new/sku','product/new/bom','product/trace',
 'orders/detail','orders/new',
 'production/new/model','production/new/bom','production/new/schedule','production/new/confirm','production/new/success','production/new/shortage','production/new/failure','production/vin','production/vin-detail','production/assembly/exception','production/assembly/recheck','production/assembly/passed',
 'inventory/detail','inventory/transfers/new','inventory/transfers/approval','inventory/transfers/outbound','inventory/transfers/tracking','inventory/transfers/receiving','inventory/transfers/returned','inventory/transfers/exception','inventory/transfers/difference','inventory/transfers/completed','inventory/warnings','inventory/dealer-stock',
 'dealers/detail','dealers/regions','dealers/purchase/request','dealers/purchase/approval','dealers/purchase/fulfillment','dealers/purchase/received',
 'customers/detail','customers/binding/search','customers/binding/confirm','customers/binding/success','customers/binding/owned','customers/binding/not-found','customers/enterprise','customers/enterprise/detail',
 'after-sales/warranty','after-sales/parts/request','after-sales/parts/shipping','after-sales/parts/replacement','after-sales/parts/shortage','after-sales/network','customers/history',
 'supply/supplier-detail','supply/parts','supply/purchase/request','supply/purchase/approval','supply/purchase/inspection','supply/purchase/received','supply/score',
 'analytics/sales','analytics/production','analytics/inventory','analytics/supply','analytics/dealers','analytics/service','analytics/export',
 'settings/employees','settings/organization','settings/roles','settings/security','settings/audit','settings/integrations','settings/messages','settings/api'
];
if(slugs.length!==review.detailAndFlowRoots.length)throw new Error('Route manifest does not match reviewed screens');
const result=[];
for(const [index,root] of [...mainRoots,...review.detailAndFlowRoots].entries()){
  const isMain=index<10;
  const route=isMain?`/admin/${modules[index]}`:`/admin/${slugs[index-10]}`;
  const module=route.split('/')[2];const area=areas[modules.indexOf(module)];
  const base=baseline.find(s=>s.route===route);
  const work=find(root,n=>/工作区/.test(n.name||''));
  let blocks=work?kids(work).filter(n=>!/^标题$|标题行|页面标题|步骤导航|流程说明|页面口径|页面说明|上下文|口径说明/.test(n.name||'')).flatMap(parsePanel):[];
  const labels=work?texts(work):[];
  let title=labels[0] || get(root)?.name?.replace(/^ALSVID Admin[｜· ]*/,'') || base?.title;
  if(isMain)title=base?.title||title;
  if(!blocks.length && base)blocks=base.blocks;
  // These five frames have incomplete MCP text reads; transcribed from the reviewed
  // transfer-detail-19-*.png screenshots, not reconstructed business transactions.
  const transferIndex=['19:2479','19:2550','19:2621','19:2692','19:2763'].indexOf(root);
  if(transferIndex>=0){
    const titles=['新建调拨申请','调拨审批','调拨出库','调拨物流跟踪','调拨收货入库'];
    const states=['申请草稿','审批中','待出库','运输中','待收货核验'];
    const fields=[
      ['来源仓库：上海仓','目标仓库：北京仓','型号 / SKU：FC1 Pro / FC1-PRO-BLK','调拨数量：20 台','申请原因：区域补货','预计到货日期：2026-10-20'],
      ['调拨单 / 申请人：TR-001 / 仓储管理员（示例）','路径 / 型号 / 数量：上海仓 → 北京仓 / FC1 Pro / 20 台','库存核验：所选20台均可销售，无订单预留','审批意见：同意区域补货；出库时核对VIN','审批人 / 处理时间：区域仓储负责人 / 2026-10-15 10:00（示例）'],
      ['调拨单 / 路径：TR-001 / 上海仓 → 北京仓','型号 / 数量：FC1 Pro / FC1-PRO-BLK / 20 台','物流公司：顺丰速运','运单号：SF-TR001-DEMO（示例）','出库人 / 出库时间：张仓管 / 2026-10-15 14:00'],
      ['调拨单 / 路径：TR-001 / 上海仓 → 北京仓','运输数量 / 库存归属：20 台 / 在途（目标仓未入库）','物流公司 / 运单：顺丰速运 / SF-TR001-DEMO（示例）','出库时间 / 预计到达：2026-10-15 14:00 / 2026-10-20','物流更新时间：2026-10-16 09:00（示例）'],
      ['调拨单 / 目标仓：TR-001 / 北京仓','应收 / 实收数量：20 台 / 20 台','目标库位：北京仓 A-01','收货人 / 收货时间：李仓管 / 2026-10-20 10:00','收货备注：VIN全部匹配，外观及包装完好']
    ];
    title=titles[transferIndex];
    blocks=[{kind:'flow',title:'调拨流程（示例）',hint:`当前：${states[transferIndex]}`,steps:['申请','审批','出库','运输','入库'].map((label,i)=>({label,state:i<transferIndex?'已完成':i===transferIndex?'当前':'未开始'}))},{kind:'fields',title:'调拨信息',items:fields[transferIndex]}];
    if(transferIndex!==3)blocks.push({kind:'table',title:'VIN核验 · 示例清单显示3条 / 共20条',hint:'不可预留订单车辆；重复扫码不重复计数；真实库存与扫码接口未接入。',columns:['VIN','型号 / SKU','库存状态','核验'],rows:['ALS00010','ALS00011','ALS00012'].map(v=>[v,'FC1 Pro / FC1-PRO-BLK',transferIndex===0?'可销售':transferIndex===4?'在途':'调拨锁定',transferIndex===0?'可调拨':'核验通过'])});
    else blocks.push({kind:'timeline',title:'物流轨迹（示例）',items:[{tag:'出库',time:'2026-10-15 14:00',text:'上海仓确认出库，20台VIN核验完成'},{tag:'揽收',time:'2026-10-15 16:30',text:'承运方已揽收，SF-TR001-DEMO'},{tag:'运输',time:'2026-10-16 09:00',text:'干线运输中，预计10月20日到达北京仓'}]});
  }
  if(!blocks.length)throw new Error(`No readable design content for ${root} ${route}`);
  result.push({id:base?.id||'ardot-'+root.replace(':','-'),area,route,title,subtitle:labels[1]||'Ardot 已审核设计 · 示例数据',actions:base?.actions,secondary:baseline.find(s=>s.route===`/admin/${module}`)?.secondary||[],blocks,sourceNode:root});
}
// Prepared panel content preserves real table/field/flow hierarchy for the last iterations.
function fromSpec(spec){
  const out=[];
  if(spec.flow)out.push({kind:'flow',title:spec.title,hint:spec.note,steps:spec.flow.map(([label,state])=>({label,state}))});
  if(spec.fields)out.push({kind:'form',title:spec.title,hint:spec.note,fields:spec.fields.map(([label,value])=>({label,value}))});
  if(spec.rows)out.push({kind:'table',title:spec.title,hint:spec.note,columns:spec.rows[0],rows:spec.rows.slice(1)});
  return out;
}
for(const file of ['service-iteration26-handoff.json','dealer-iteration25-result.json','settings-iteration21-plan.json']){
 const data=JSON.parse(fs.readFileSync(path.join(audit,file),'utf8'));
 if(Array.isArray(data.content))data.screens.forEach((s,i)=>{const dst=result.find(r=>r.sourceNode===s.root);if(dst && Array.isArray(data.content[i])){const blocks=data.content[i].flatMap(fromSpec);if(blocks.length)dst.blocks=blocks;}});
}
// Correct stale leaf values in older cached source reads using the reviewed chain.
const canonical = {
  '配置：Standard · 折叠版':'配置：PRO · 折叠版',
  '生产日期：2026-10-10':'生产日期：2026-09-20',
  '生产批次：B202610':'生产批次：B202609',
  '出厂日期：2026-10-12':'出厂日期：待核验',
  '交付日期：2026-10-16':'交付日期：2026-10-01',
  '绑定时间：2026-10-16':'绑定时间：2026-10-01',
  '最近服务：2026-10-01':'最近服务：2026-10-14'
};
for(const route of ['/admin/production/vin-detail','/admin/customers/detail','/admin/orders/detail']){
 const s=result.find(x=>x.route===route);if(s)s.blocks=JSON.parse(JSON.stringify(s.blocks),(k,v)=>typeof v==='string'?(canonical[v]||v):v);
}
const stock=result.find(s=>s.route==='/admin/inventory');
for(const b of stock.blocks){if(b.kind==='table'&&b.columns.includes('库存状态')){const row=b.rows.find(r=>r[0]==='FC1 Pro');if(row)row[row.length-1]='混合库存';}}
for(const s of result){
 const filter=s.blocks.find(b=>b.kind==='fields'&&b.title==='筛选行');
 const table=s.blocks.find(b=>b.kind==='table');
 if(filter&&table){table.search=filter.items.find(x=>x.includes('搜索'))||table.search;s.blocks=s.blocks.filter(b=>b!==filter);}
}
const flows=['/product/new/','/production/new/','/production/assembly/','/inventory/transfers/','/dealers/purchase/','/customers/binding/','/after-sales/parts/','/supply/purchase/'];
for(const flow of flows){const group=result.filter(s=>s.route.includes(flow));for(const s of group)s.steps=group.map(({title:label,route:href})=>({label,href}));}
fs.writeFileSync(path.join(target,'synced-screens.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(target,'sync-manifest.json'),JSON.stringify({source:'https://ardot.tencent.com/file/736467599966143',reviewed:'2026-10-16',scope:'UI fixtures only; no backend business writes',screens:result.map(({sourceNode,route,title})=>({sourceNode,route,title}))},null,2)+'\n');
console.log(JSON.stringify({screens:result.length,empty:result.filter(r=>!r.blocks.length).length,blocks:result.reduce((n,r)=>n+r.blocks.length,0)}));
