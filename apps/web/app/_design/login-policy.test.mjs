import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const from = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Admin, Dealer and Supplier password login are enabled independently at every trust boundary', () => {
  const api = from('../../../api/src/auth.controller.ts');
  const proxy = from('../api/session/login/route.ts');
  const login = from('../login/page.tsx');
  const ui = from('../_components/portal-login.tsx');
  const deploy = from('../../../../.github/workflows/production-deploy.yml');
  const wwwDeploy = from('../../../../.github/workflows/www-deploy.yml');

  assert.match(api, /body\?\.portal === 'admin'[\s\S]*ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(api, /body\?\.portal === 'dealer'[\s\S]*ALSVID_DEALER_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(api, /body\?\.portal === 'supplier'[\s\S]*ALSVID_SUPPLIER_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(proxy, /portal === 'admin'[\s\S]*ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(proxy, /portal === 'dealer'[\s\S]*ALSVID_DEALER_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(proxy, /portal === 'supplier'[\s\S]*ALSVID_SUPPLIER_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(login, /portal === 'admin'[\s\S]*ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(login, /portal === 'dealer'[\s\S]*ALSVID_DEALER_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(login, /portal === 'supplier'[\s\S]*ALSVID_SUPPLIER_PASSWORD_LOGIN_ENABLED === 'true'/);
  for (const source of [api, proxy, login]) assert.doesNotMatch(source, /ALSVID_PASSWORD_LOGIN_ENABLED/);
  assert.match(api, /identityService\.login\(identifier, body\.password\)/);
  assert.match(ui, /passwordLoginEnabled \? 'password' : 'email'/);
  assert.match(ui, /forgotPasswordRequested/);
  assert.match(ui, /role="dialog" aria-modal="true"/);
  assert.match(ui, /\/api\/session\/password-reset\/request/);
  assert.match(ui, /passwordLoginEnabled && method === 'password'/);
  for (const flag of ['ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED', 'ALSVID_DEALER_PASSWORD_LOGIN_ENABLED', 'ALSVID_SUPPLIER_PASSWORD_LOGIN_ENABLED']) {
    assert.match(deploy, new RegExp(flag + '=true'));
    assert.match(wwwDeploy, new RegExp(flag + '=true'));
  }
});

test('forgot password uses the existing reset API and carries portal and locale safely', () => {
  const ui = from('../_components/portal-login.tsx');
  const resetPage = from('../reset-password/page.tsx');
  const api = from('../../../api/src/auth.controller.ts');
  const identity = from('../../../../domains/identity/src/application/identity-service.ts');

  assert.match(ui, /JSON\.stringify\(\{ email: nextEmail, portal, locale \}\)/);
  assert.match(resetPage, /if \(!token\) router\.replace/);
  assert.match(resetPage, /forgot=1/);
  assert.match(identity, /searchParams\.set\('portal', portal!\)/);
  assert.match(identity, /searchParams\.set\('locale', locale!\)/);
  assert.match(api, /requestPasswordReset\([\s\S]*portal,[\s\S]*locale/);
});

test('first account password setup and email authentication remain available', () => {
  const ui = from('../_components/portal-login.tsx');
  assert.match(ui, /async function submitEmail/);
  assert.match(ui, /\/api\/session\/email\/start/);
  assert.match(ui, /\/api\/session\/email\/complete/);
  assert.match(ui, /async function submitPasswordSetup/);
  assert.match(ui, /\/api\/session\/password/);
  assert.match(ui, /passwordSetupRequired/);
});
