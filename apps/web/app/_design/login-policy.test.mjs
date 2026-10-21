import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const from = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Admin password login uses a dedicated flag at every trust boundary', () => {
  const api = from('../../../api/src/auth.controller.ts');
  const proxy = from('../api/session/login/route.ts');
  const login = from('../login/page.tsx');
  const ui = from('../_components/portal-login.tsx');
  const deploy = from('../../../../.github/workflows/production-deploy.yml');

  for (const source of [api, proxy]) {
    assert.match(source, /portal === 'admin'[\s\S]*ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'/);
    assert.match(source, /ALSVID_PASSWORD_LOGIN_ENABLED === 'true'/);
  }
  assert.match(api, /identityService\.login\(identifier, body\.password\)/);
  assert.match(login, /portal === 'admin'[\s\S]*ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(login, /ALSVID_PASSWORD_LOGIN_ENABLED === 'true'/);
  assert.match(ui, /portal === 'admin' && passwordLoginEnabled \? 'password' : 'email'/);
  assert.match(ui, /passwordLoginEnabled = false/);
  assert.match(ui, /passwordLoginEnabled && method === 'password'/);
  assert.match(ui, /if \(!passwordLoginEnabled\) return;/);
  assert.match(deploy, /ALSVID_ADMIN_PASSWORD_LOGIN_ENABLED=true/);
});

test('first account password setup and email authentication are not removed', () => {
  const ui = from('../_components/portal-login.tsx');
  assert.match(ui, /async function submitEmail/);
  assert.match(ui, /\/api\/session\/email\/start/);
  assert.match(ui, /\/api\/session\/email\/complete/);
  assert.match(ui, /async function submitPasswordSetup/);
  assert.match(ui, /\/api\/session\/password/);
  assert.match(ui, /passwordSetupRequired/);
});
