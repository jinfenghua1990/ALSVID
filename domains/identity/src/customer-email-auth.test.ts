import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityService } from './application/identity-service.js';
import type { IdentityRepository } from './application/ports.js';
import { InvalidEmailCodeError } from './core/errors.js';

function fixture(existing = false, email = 'owner@example.com') {
  const now = new Date('2026-10-20T12:00:00Z');
  let userId: string | null = existing ? 'owner-id' : null;
  let challenge: any = null;
  let sessions = 0;
  const roles = new Set<string>(existing ? ['customer_user'] : []);
  const actions: string[] = [];
  const context = () => ({ userId: userId!, email, displayName: 'Owner', roles: [...roles], permissions: [] });
  const repository = {
    transaction: async (work: any) => work({}),
    findUserIdByEmail: async () => userId,
    hasActiveSystemAdmin: async () => false,
    hasValidRegistrationInvite: async () => false,
    findLatestEmailChallenge: async () => null,
    invalidateActiveEmailChallenges: async () => {},
    createEmailChallenge: async (_email: string, hash: string, expiresAt: Date, maxAttempts: number) => {
      challenge = { id:'challenge', codeHash:hash, expiresAt, maxAttempts, attempts:0, consumedAt:null, createdAt:now };
      return 'challenge';
    },
    findEmailChallengeForUpdate: async () => challenge,
    incrementEmailChallengeAttempts: async () => { challenge.attempts++; },
    consumeEmailChallenge: async () => { challenge.consumedAt = now; },
    getSecurityPolicy: async () => ({ sessionTtlDays:7 }),
    createUser: async () => { userId = 'new-owner'; return userId; },
    consumeRegistrationInvite: async () => { throw Error('Customer verification must not consume an Internal invite'); },
    markEmailVerified: async () => {},
    ensureUserRole: async (_id: string, role: string) => { roles.add(role); },
    createSession: async () => { sessions++; },
    findUserContextById: async () => context(),
  } as unknown as IdentityRepository;
  const service = new IdentityService(repository, { record: async input => { actions.push(input.action); } },
    { hash:async p => p, verify:async (p,h) => p===h },
    { create:()=>'123456', hash:async code=>'hash:'+code, verify:async (code,hash)=>hash==='hash:'+code },
    { create:()=>'session-token', hash:token=>'hash:'+token },
    { configured:true, sendCode:async()=>{} }, { configured:true, sendResetEmail:async()=>{} },
    { approvedEmailDomains:['company.test'], registrationMode:'invite_only', initialAdminEmail:email, verificationTtlMs:600000, resendCooldownMs:60000, maxVerificationAttempts:5, exposeTestCode:false },
    { now:()=>now });
  return { service, roles, actions, get sessions(){ return sessions; }, get challenge(){ return challenge; } };
}

test('verified first-party owner registration grants only customer_user, never Internal or first-admin access', async () => {
  const f = fixture();
  await f.service.startEmailVerification('owner@example.com', 'customer');
  const result = await f.service.completeEmailVerification('owner@example.com', '123456', 'Owner', 'customer');
  assert.deepEqual(result.user.roles, ['customer_user']);
  assert.equal(result.firstAdminActivated, false);
  assert.equal(f.sessions, 1);
  assert.ok(f.actions.includes('identity.customer_registered'));
  assert.ok(!f.actions.includes('identity.first_admin_activated'));
});

test('a customer challenge cannot be replayed to activate Internal or an initial administrator', async () => {
  const f = fixture();
  await f.service.startEmailVerification('owner@example.com', 'customer');
  await assert.rejects(() => f.service.completeEmailVerification('owner@example.com', '123456', 'Owner', 'internal'), InvalidEmailCodeError);
  assert.equal(f.sessions, 0);
  assert.equal(f.roles.size, 0);
  assert.equal(f.challenge.attempts, 1);
});

test('an existing owner logging through an Internal audience is not granted an Internal role', async () => {
  const f = fixture(true, 'owner@outside.test');
  // Use an email different from the configured bootstrap candidate.
  await f.service.startEmailVerification('different@outside.test', 'internal');
  const result = await f.service.completeEmailVerification('different@outside.test', '123456', undefined, 'internal');
  assert.deepEqual(result.user.roles, ['customer_user']);
  assert.equal(result.firstAdminActivated, false);
});

test('an invalid or expired owner code cannot create an account or a session', async () => {
  const f = fixture();
  await f.service.startEmailVerification('owner@example.com', 'customer');
  await assert.rejects(() => f.service.completeEmailVerification('owner@example.com', '000000', undefined, 'customer'), InvalidEmailCodeError);
  assert.equal(f.sessions, 0);
  assert.equal(f.roles.size, 0);
  f.challenge.expiresAt = new Date('2020-01-01T00:00:00Z');
  await assert.rejects(() => f.service.completeEmailVerification('owner@example.com', '123456', undefined, 'customer'), InvalidEmailCodeError);
});
