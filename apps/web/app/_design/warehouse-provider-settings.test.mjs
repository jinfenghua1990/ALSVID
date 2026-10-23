import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../settings/integrations/integrations-admin-client.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../../../../domains/integrations/src/application/integration-service.ts', import.meta.url), 'utf8');
const repository = readFileSync(new URL('../../../../domains/integrations/src/infrastructure/postgres-integration-repository.ts', import.meta.url), 'utf8');

test('warehouse integration UI reports persisted states and never renders the Secret Manager resource path', () => {
  assert.match(ui, /\/v1\/integrations\/warehouse-providers/);
  assert.match(ui, /NOT_CONFIGURED/);
  assert.match(ui, /PENDING_REVIEW/);
  assert.match(ui, /CONNECTED/);
  assert.match(ui, /credentials_configured/);
  assert.doesNotMatch(ui, /credentials_secret_ref/);
  assert.match(ui, /不会因为保存记录就显示已连接/);
  assert.match(ui, /不会触发同步或订单履约/);
});

test('provider registration validates Secret Manager references and returns only a configured boolean', () => {
  assert.match(service, /Google Secret Manager resource path, not a secret value/);
  assert.match(service, /credentialsConfigured: Boolean\(credentialsSecretRef\)/);
  assert.match(repository, /credentials_secret_ref IS NOT NULL\) AS credentials_configured/);
  assert.doesNotMatch(repository, /SELECT[^\n]*credentials_secret_ref,/);
  assert.doesNotMatch(repository, /r\.error_message/);
});

test('provider configuration is gated by the integration admin permission', () => {
  assert.match(service, /warehouseProviderSummary\(actor: IntegrationActor\)[\s\S]{0,150}requirePermission\(actor, IntegrationCapability\.Admin\)/);
  assert.match(service, /createWarehouseProviderConnection\([\s\S]{0,150}requirePermission\(actor, IntegrationCapability\.Admin\)/);
});
