import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityService } from './application/identity-service.js';

const userId='11111111-1111-4111-8111-111111111111';
const partnerId='22222222-2222-4222-8222-222222222222';
const admin={userId:'33333333-3333-4333-8333-333333333333',email:'admin@example.com',displayName:'Admin',
 roles:['system_admin'],permissions:['identity.role.manage']};

test('supplier membership inspection returns only the selected pair and never trusts email matching',async()=>{
 let called:unknown[]=[];
 const repository={getSupplierMembership:async(user:string,partner:string)=>{
  called=[user,partner];
  return {status:'ACTIVE' as const,updatedAt:'2026-10-19T00:00:00.000Z'};
 }};
 const service=new IdentityService(repository as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never);
 const row=await service.supplierMembershipStatus(admin,userId,partnerId);
 assert.deepEqual(called,[userId,partnerId]);
 assert.equal(row.status,'ACTIVE');
 await assert.rejects(service.supplierMembershipStatus({...admin,roles:['supplier_user']},userId,partnerId));
 await assert.rejects(service.supplierMembershipStatus({...admin,permissions:[]},userId,partnerId));
 await assert.rejects(service.supplierMembershipStatus(admin,'invalid',partnerId));
});
test('missing membership stays UNASSIGNED without fabricating supplier access',async()=>{
 const repository={getSupplierMembership:async()=>null};
 const service=new IdentityService(repository as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never);
 const row=await service.supplierMembershipStatus(admin,userId,partnerId);
 assert.equal(row.status,'UNASSIGNED');
 assert.equal(row.updatedAt,null);
});
