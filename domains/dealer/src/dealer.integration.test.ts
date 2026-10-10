import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { AuditService } from '@alsvid/audit';
import { Database } from '@alsvid/database';
import type { AuthContext } from '@alsvid/identity';
import { DealerConflictError, DealerService } from './index.js';

const hasDatabase=Boolean(process.env.DATABASE_URL);
const suffix=()=>randomUUID().replaceAll('-','').slice(0,10).toUpperCase();

async function actor(db:Database):Promise<AuthContext>{
  const email=`dealer-${suffix().toLowerCase()}@example.com`;
  const row=await db.query<{id:string}>(`INSERT INTO identity.users(email,display_name,password_hash) VALUES ($1,'Dealer Test','x') RETURNING id`,[email]);
  return{userId:row.rows[0]!.id,email,displayName:'Dealer Test',roles:['dealer_manager'],permissions:['dealer.read','dealer.write','partner.read']};
}

async function partner(db:Database,role?:'DEALER'):Promise<string>{
  const row=await db.query<{id:string}>(`INSERT INTO partners.partners(kind,display_name,country_code) VALUES ('ORGANIZATION',$1,'DE') RETURNING id`,[`Dealer ${suffix()}`]);
  if(role)await db.query(`INSERT INTO partners.roles(partner_id,role) VALUES ($1,$2)`,[row.rows[0]!.id,role]);
  return row.rows[0]!.id;
}

test('Dealer profile requires DEALER Partner role and lifecycle history is immutable', {skip:!hasDatabase}, async()=>{
  const db=new Database();
  try{
    const auth=await actor(db);const service=new DealerService(db,new AuditService(db));
    const invalidPartner=await partner(db);
    await assert.rejects(service.create(auth,{partnerId:invalidPartner}),DealerConflictError);

    const dealerPartner=await partner(db,'DEALER');
    const created=await service.create(auth,{partnerId:dealerPartner,marketCountries:['DE','AT'],salesEnabled:true,serviceEnabled:true});
    assert.equal(created.status,'PROSPECT');
    await assert.rejects(service.changeStatus(auth,created.id,{expectedVersion:created.version,status:'SUSPENDED',reason:'invalid jump'}),DealerConflictError);

    const active=await service.changeStatus(auth,created.id,{expectedVersion:created.version,status:'ACTIVE',reason:'Commercial agreement signed'});
    assert.equal(active.status,'ACTIVE');
    const history=await db.query<any>(`SELECT * FROM dealer.status_history WHERE dealer_id=$1`,[created.id]);
    assert.equal(history.rows.length,1);assert.equal(history.rows[0].from_status,'PROSPECT');assert.equal(history.rows[0].to_status,'ACTIVE');assert.equal(history.rows[0].reason,'Commercial agreement signed');
    await assert.rejects(db.query(`UPDATE dealer.status_history SET reason='mutated' WHERE id=$1`,[history.rows[0].id]),/append-only/);
  }finally{await db.close();}
});
