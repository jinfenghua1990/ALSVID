import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { appNavigation, navigationFor } from './app-navigation.ts';

test('unfinished secondary navigation entries are visible but not clickable', () => {
  const unfinished = appNavigation.filter((item) => item.status === '建设中');
  assert.equal(unfinished.length, 25, 'current unfinished menu inventory stays explicit');
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
// `/admin/*` is covered by its own assertion below: those screens are drawn from a data-only
// `Block` union, so they can never carry an id and must not advertise an anchor at all.
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

// `/admin/*` screens come from the Ardot renderer, whose `Block` union has no `id` field, so
// nothing on those pages can be an anchor target. `/admin#overview` and `/admin#attention`
// promised sections that could never exist and silently dropped the visitor at the page top.
test('design-rendered admin entries never promise an anchor', () => {
  const anchored = appNavigation.filter((item) => item.href.startsWith('/admin') && item.href.includes('#'));
  assert.deepEqual(
    anchored.map((item) => `${item.label} -> ${item.href}`),
    [],
    'the design renderer draws blocks without ids, so an /admin anchor cannot resolve',
  );
});

// The after-sales work orders are served by ServiceCaseClient at /admin/after-sales, which is
// wired to /v1/service/cases. The root-path /after-sales and /after-sales/repairs routes are
// still PortalSectionPage placeholders, so an enabled sidebar entry must not point at them.
test('after-sales entries target the real workbench instead of the root-path placeholder', () => {
  const afterSales = appNavigation.filter((item) => item.area === '售后服务' && !item.disabled);
  assert.ok(afterSales.length > 0, 'after-sales must have an enabled entry');
  for (const item of afterSales) {
    assert.equal(item.href, '/admin/after-sales', `${item.label} must point at the real workbench`);
  }
  assert.ok(
    !appNavigation.some((item) => !item.disabled && item.href.startsWith('/after-sales')),
    'no enabled entry may point at the root-path after-sales placeholder',
  );
  const client = readFileSync(new URL('./_design/service-cases.tsx', import.meta.url), 'utf8');
  assert.match(client, /\/v1\/service\/cases/, 'the after-sales workbench reads real service cases');
  assert.match(client, /expectedVersion:detail\.case\.version/, 'case transitions are version-guarded');
});
