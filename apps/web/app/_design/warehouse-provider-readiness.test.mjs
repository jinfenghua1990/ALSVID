import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../inventory/inventory-client.tsx', import.meta.url), 'utf8');

test('Admin inventory explicitly shows that third-party WMS is not connected', () => {
  assert.match(source, /id="warehouse-provider"/);
  assert.match(source, /连接状态：未配置/);
  assert.match(source, /不会发起外部同步/);
  assert.match(source, /不会把第三方库存计入可售库存/);
  assert.match(source, /库存快照与对账/);
  assert.match(source, /订单履约与运单/);
  assert.match(source, /收货与退货回执/);
});

test('the unconfigured WMS card does not advertise a fake connect or sync action', () => {
  const card = source.slice(source.indexOf('id="warehouse-provider"'), source.indexOf('<section className={styles.topGrid}>', source.indexOf('id="warehouse-provider"')));
  assert.doesNotMatch(card, /测试连接|立即同步|同步成功|已连接/);
});
