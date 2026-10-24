import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { appNavigation, navigationFor } from './app-navigation.ts';

test('unfinished secondary navigation entries are visible but not clickable', () => {
  const unfinished = appNavigation.filter((item) => item.status === '建设中');
  assert.equal(unfinished.length, 27, 'current unfinished menu inventory stays explicit');
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

// A `#anchor` href only works when the target workspace renders that id. Anchors used to
// point at sections that never existed, so the click silently landed on the page top.
// `/admin/*` is excluded on purpose: the Ardot renderer owns those anchors.
const workspaceSources = {
  '/product': './product/product-client.tsx',
  '/production': './production/production-client.tsx',
  '/inventory': './inventory/inventory-client.tsx',
  '/supply': './supply/supply-client.tsx',
};

test('every enabled deep link resolves to an anchor the target workspace renders', () => {
  const anchored = appNavigation.filter((item) => item.href.includes('#') && !item.href.startsWith('/admin'));
  assert.ok(anchored.length > 0, 'deep links are expected to exist');
  for (const item of anchored) {
    const source = workspaceSources[item.href.split('#')[0]];
    assert.ok(source, `no workspace source mapped for ${item.href}`);
    assert.equal(item.disabled, undefined, `${item.label} points at ${item.href} but is still marked unfinished`);
    const rendered = readFileSync(new URL(source, import.meta.url), 'utf8');
    const anchor = item.href.split('#')[1];
    assert.match(rendered, new RegExp(`id=["'{]${anchor}["'}]`), `${item.href} has no matching id in ${source}`);
  }
});

test('unfinished entries never carry an anchor', () => {
  for (const item of appNavigation.filter((entry) => entry.disabled)) {
    assert.ok(!item.href.includes('#'), `${item.label} is unfinished and must not deep link into ${item.href}`);
  }
});
