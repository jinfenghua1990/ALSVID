import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { Database } from '@alsvid/database';
import { createInventoryService } from '@alsvid/inventory';
import { createWarehouseService } from './index.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const suffix=()=>randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
const audit={async record():Promise<void>{}};
type TestActor={userId:string;permissions:string[]};

async function actor(db:Database):Promise<TestActor>{
  const email=`warehouse-${suffix().toLowerCase()}@example.com`;
  const user=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Warehouse Test','x') RETURNING id`,[email]);
  return{userId:user.rows[0]!.id,permissions:['inventory.read','inventory.move','inventory.reserve','inventory.stocktake','inventory.adjust','warehouse.manage']};
}

test('closing stocktake appends correction movement instead of overwriting balance', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const inventory=createInventoryService(db,audit);const warehouse=createWarehouseService(db,audit,inventory);
    const key=suffix();
    const w=await warehouse.createWarehouse(auth,{code:`DE${key}`,name:'Germany Test Warehouse',countryCode:'DE',timezone:'Europe/Berlin'});
    const location=await warehouse.createLocation(auth,{warehouseId:w.id,code:'A01',name:'A01 Storage',locationType:'STORAGE'});
    const part=await db.query<{id:string}>(`INSERT INTO engineering.parts(part_number,name,default_unit) VALUES ($1,'Stocktake Part','EA') RETURNING id`,[`ST-${key}`]);
    await inventory.postMovement(auth,{movementType:'RECEIPT',itemKind:'PART',itemId:part.rows[0]!.id,unit:'EA',quantity:'10',destinationLocationId:location.id,idempotencyKey:`stocktake-receipt-${key}`});
    const session=await warehouse.openStocktake(auth,{warehouseId:w.id,note:'Cycle count'});
    const count=await warehouse.recordCount(auth,session.id,{locationId:location.id,itemKind:'PART',itemId:part.rows[0]!.id,countedQuantity:'7',unit:'EA'});
    await warehouse.closeStocktake(auth,session.id);
    assert.equal(Number(await inventory.balanceAt({itemKind:'PART',itemId:part.rows[0]!.id,unit:'EA',locationId:location.id})),7);
    const correction=await db.query<{movement_type:string;quantity:string}>(`SELECT movement_type,quantity::text FROM inventory.movements WHERE reference_type='STOCKTAKE' AND reference_id=$1`,[session.id]);
    assert.equal(correction.rows.length,1);assert.equal(correction.rows[0]!.movement_type,'STOCKTAKE_CORRECTION');assert.equal(Number(correction.rows[0]!.quantity),3);
    const state=await db.query<{status:string}>(`SELECT status FROM warehouse.stocktake_sessions WHERE id=$1`,[session.id]);assert.equal(state.rows[0]!.status,'CLOSED');
    await assert.rejects(db.query(`UPDATE warehouse.stocktake_counts SET counted_quantity=9 WHERE id=$1`,[count.id]),/append-only/);
  }finally{await db.close();}
});
