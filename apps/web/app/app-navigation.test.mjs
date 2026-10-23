import assert from 'node:assert/strict';
import test from 'node:test';
import { appNavigation, navigationFor } from './app-navigation.ts';

test('unfinished secondary navigation entries are visible but not clickable', () => {
  const unfinished = appNavigation.filter((item) => item.status === '建设中');
  assert.equal(unfinished.length, 32, 'current unfinished menu inventory stays explicit');
  assert.ok(unfinished.every((item) => item.disabled === true), 'unfinished entries must be disabled');
  assert.equal(appNavigation.filter((item) => item.status === '骨架').length, 0, 'raw placeholder status must not reach the UI');
});

test('unfinished entries cannot become the active navigation target', () => {
  const unfinished = appNavigation.find((item) => item.status === '建设中');
  assert.ok(unfinished);
  const resolved = navigationFor(unfinished.href);
  assert.ok(
    !resolved.some((item) => item.disabled && item.active),
    'a disabled placeholder must never be marked active',
  );
});

test('warehouse integration settings are reachable from the Admin sidebar', () => {
  const integrations = appNavigation.find((item) => item.href === '/settings/integrations');
  assert.ok(integrations, 'system integrations navigation entry exists');
  assert.equal(integrations.disabled, undefined, 'implemented integration settings must be enabled');
  assert.equal(integrations.status, undefined, 'implemented integration settings must not show a construction badge');
  assert.ok(navigationFor('/settings/integrations').some((item) => item.href === '/settings/integrations' && item.active && !item.disabled));
});
