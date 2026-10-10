import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const suffix=()=>randomUUID().replaceAll('-','').slice(0,10).toUpperCase();

async function factory(db:Database,valid=true):Promise<string>{
  const p=await db.query<{id:string}>(`INSERT INTO partners.partners(kind,display_name) VALUES ('ORGANIZATION',$1) RETURNING id`,[`Factory ${suffix()}`]);
  if(valid)await db.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,'FACTORY')`,[p.rows[0]!.id]);
  return p.rows[0]!.id;
}

async function buildSpec(db:Database,released=true):Promise<{specId:string;skuId:string}>{
  const code=suffix();
  const platform=await db.query<{id:string}>(`SELECT id FROM product.platforms WHERE code='FC'`);
  const model=await db.query<{id:string}>(`INSERT INTO product.models(platform_id,code,name) VALUES ($1,$2,'Prod Test') RETURNING id`,[platform.rows[0]!.id,`M${code}`]);
  const variant=await db.query<{id:string}>(`INSERT INTO product.variants(model_id,code,name) VALUES ($1,'BASE','Base') RETURNING id`,[model.rows[0]!.id]);
  const sku=await db.query<{id:string}>(`INSERT INTO product.skus(variant_id,sku,name) VALUES ($1,$2,'Prod SKU') RETURNING id`,[variant.rows[0]!.id,`S${code}`]);
  const bom=await db.query<{id:string}>(`INSERT INTO engineering.boms(model_id,code,name) VALUES ($1,$2,'Prod BOM') RETURNING id`,[model.rows[0]!.id,`B${code}`]);
  const rev=await db.query<{id:string}>(`INSERT INTO engineering.bom_revisions(bom_id,revision_code) VALUES ($1,'A') RETURNING id`,[bom.rows[0]!.id]);
  await db.query(`UPDATE engineering.bom_revisions SET status='RELEASED',released_at=now() WHERE id=$1`,[rev.rows[0]!.id]);
  const spec=await db.query<{id:string}>(`INSERT INTO engineering.build_specs(code,sku_id,bom_revision_id,status,released_at) VALUES ($1,$2,$3,$4,$5) RETURNING id`,[`BS${code}`,sku.rows[0]!.id,rev.rows[0]!.id,released?'RELEASED':'DRAFT',released?new Date():null]);
  return{specId:spec.rows[0]!.id,skuId:sku.rows[0]!.id};
}

test('Production Order requires released Build Spec and FACTORY Partner role', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const invalidFactory=await factory(db,false);
    const released=await buildSpec(db,true);
    await assert.rejects(db.query(`INSERT INTO production.production_orders(build_spec_id,factory_partner_id,planned_quantity) VALUES ($1,$2,1)`,[released.specId,invalidFactory]),/FACTORY Partner role/);
    const validFactory=await factory(db,true);
    const draft=await buildSpec(db,false);
    await assert.rejects(db.query(`INSERT INTO production.production_orders(build_spec_id,factory_partner_id,planned_quantity) VALUES ($1,$2,1)`,[draft.specId,validFactory]),/released Build Specification/);
  }finally{await db.close();}
});

test('QC fail cannot birth Vehicle; QC pass can birth exactly one immutable frame identity', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const factoryId=await factory(db,true);
    const spec=await buildSpec(db,true);
    const order=await db.query<{id:string}>(`INSERT INTO production.production_orders(build_spec_id,factory_partner_id,planned_quantity,status,released_at) VALUES ($1,$2,1,'RELEASED',now()) RETURNING id`,[spec.specId,factoryId]);
    const unit=await db.query<{id:string}>(`INSERT INTO production.production_units(production_order_id,unit_no,status) VALUES ($1,1,'QC_PENDING') RETURNING id`,[order.rows[0]!.id]);
    const fail=await db.query<{id:string}>(`INSERT INTO production.qc_inspections(production_unit_id,result,inspected_by) VALUES ($1,'FAIL',(SELECT id FROM identity.users LIMIT 1)) RETURNING id`,[unit.rows[0]!.id]).catch(async()=>{
      const user=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Test','x') RETURNING id`,[`prod-${suffix().toLowerCase()}@example.com`]);
      return db.query<{id:string}>(`INSERT INTO production.qc_inspections(production_unit_id,result,inspected_by) VALUES ($1,'FAIL',$2) RETURNING id`,[unit.rows[0]!.id,user.rows[0]!.id]);
    });
    await db.query(`UPDATE production.production_units SET status='QC_FAILED' WHERE id=$1`,[unit.rows[0]!.id]);
    await assert.rejects(db.query(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[`FRAME-${suffix()}`,unit.rows[0]!.id,order.rows[0]!.id,spec.specId,spec.skuId,factoryId,fail.rows[0]!.id]),/QC_PASSED/);
    await db.query(`UPDATE production.production_units SET status='QC_PENDING' WHERE id=$1`,[unit.rows[0]!.id]);
    const inspector=await db.query<{id:string}>(`SELECT inspected_by AS id FROM production.qc_inspections WHERE id=$1`,[fail.rows[0]!.id]);
    const pass=await db.query<{id:string}>(`INSERT INTO production.qc_inspections(production_unit_id,result,inspected_by) VALUES ($1,'PASS',$2) RETURNING id`,[unit.rows[0]!.id,inspector.rows[0]!.id]);
    await db.query(`UPDATE production.production_units SET status='QC_PASSED' WHERE id=$1`,[unit.rows[0]!.id]);
    const frame=`FRAME-${suffix()}`;
    const vehicle=await db.query<{id:string}>(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[frame,unit.rows[0]!.id,order.rows[0]!.id,spec.specId,spec.skuId,factoryId,pass.rows[0]!.id]);
    await assert.rejects(db.query(`INSERT INTO vehicle.vehicles(frame_number,production_unit_id,production_order_id,build_spec_id,sku_id,factory_partner_id,birth_qc_inspection_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,[`OTHER-${suffix()}`,unit.rows[0]!.id,order.rows[0]!.id,spec.specId,spec.skuId,factoryId,pass.rows[0]!.id]),/duplicate key/);
    await assert.rejects(db.query(`UPDATE vehicle.vehicles SET frame_number=$2 WHERE id=$1`,[vehicle.rows[0]!.id,`NEW-${suffix()}`]),/immutable/);
  }finally{await db.close();}
});
