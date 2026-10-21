import assert from 'node:assert/strict';
import test from 'node:test';
import type { DatabasePort, QueryExecutor } from '@alsvid/database';
import { PostgresTestRideRepository } from './infrastructure/postgres-test-ride-repository.js';

const sample = {
 name:'Visitor',email:'rider@example.de',country:'DE' as const,
 city:'Berlin',model:'FC1 Standard',colour:'Graphite',locale:'de' as const
};
type QueryOutput={rows:Record<string,unknown>[];rowCount:number};
function harness(responses:QueryOutput[]) {
 const calls:{sql:string;args:unknown[]}[]=[];
 const db={
  async query(sql:string,args:unknown[]=[]):Promise<QueryOutput>{
   calls.push({sql,args});
   return responses.shift()??{rows:[],rowCount:0};
  },
  async transaction<T>(work:(executor:QueryExecutor)=>Promise<T>):Promise<T>{
   return work(this as unknown as QueryExecutor);
  }
 } as unknown as DatabasePort;
 return {repository:new PostgresTestRideRepository(db),calls};
}
const result=(rows:Record<string,unknown>[]=[],rowCount=rows.length)=>({rows,rowCount});

test('stores a new test-ride request, with a transaction and a bounded city',async()=>{
 const h=harness([result(),result(),result([{id:'test-id'}])]);
 const response=await h.repository.submit(sample);
 assert.deepEqual(response,{id:'test-id',created:true});
 assert.ok(h.calls.some(call=>call.sql.includes('INSERT INTO partners.test_ride_enquiries')));
 assert.ok(h.calls.some(call=>call.sql.includes('created_at>now()')));
 assert.ok(h.calls.some(call=>call.sql.includes('pg_advisory_xact_lock')));
});

test('deduplicated trial interest does not insert another request',async()=>{
 const h=harness([result(),result([{id:'existing'}])]);
 assert.deepEqual(await h.repository.submit(sample),{id:'existing',created:false});
 assert.equal(h.calls.filter(call=>call.sql.includes('INSERT')).length,0);
});

test('an unapproved, inactive, non-dealer or cross-country location cannot be assigned',async()=>{
 const h=harness([result([{country_code:'DE'}]),result()]);
 assert.equal(await h.repository.change('request-id','REVIEWING','location-id'),false);
 assert.equal(h.calls.some(call=>call.sql.includes('UPDATE partners.test_ride_enquiries')),false);
 const candidate=h.calls.find(call=>call.sql.includes('FROM partners.public_locations'));
 assert.ok(candidate);
 assert.deepEqual(candidate.args,['location-id','DE']);
 assert.match(candidate.sql,/approved_for_publication=true/);
 assert.match(candidate.sql,/authorization_active=true/);
 assert.match(candidate.sql,/role.role='DEALER'/);
 assert.match(candidate.sql,/test_ride_authorized=true/);
});

test('enabling a trial location requires an eligible, published dealer',async()=>{
 const h=harness([result()]);
 assert.equal(await h.repository.authorizeLocation('location-id',true),false);
 const sql=h.calls[0]!.sql;
 assert.match(sql,/approved_for_publication=true/);
 assert.match(sql,/authorization_active=true/);
 assert.match(sql,/role.role='DEALER'/);
 assert.match(sql,/role.enabled=true/);
 assert.deepEqual(h.calls[0]!.args,['location-id',true]);
});
