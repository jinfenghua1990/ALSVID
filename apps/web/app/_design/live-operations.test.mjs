import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const api = join(here, '..', '..', '..', 'api', 'src');
const config = JSON.parse(readFileSync(join(here, 'live-operations.json'), 'utf8'));

test('live metrics only refer to actual authenticated ALSVID summary endpoints', () => {
  const controllers = {
    '/v1/commerce': 'commerce.controller.ts',
    '/v1/production': 'production.controller.ts',
    '/v1/inventory': 'inventory.controller.ts',
    '/v1/dealers': 'dealer.controller.ts',
  };
  assert.equal(config.liveMetrics.length, 4);
  assert.equal(new Set(config.liveMetrics.map(item => item.key)).size, config.liveMetrics.length);

  for (const metric of config.liveMetrics) {
    const controllerName = controllers[metric.path];
    assert.ok(controllerName, metric.path);
    const source = readFileSync(join(api, controllerName), 'utf8');
    assert.ok(source.includes("@Controller('" + metric.path.slice(1) + "')"), metric.path);
    assert.match(source, /@Get\(\)/);
    assert.match(source, /requireAuth\(request\)/);
    assert.ok(metric.field && metric.help);
    assert.ok(existsSync(join(app, metric.href.slice(1), 'page.tsx')), metric.href);
  }
});

test('operational links target actual protected pages, never Ardot fixture pages', () => {
  const items = config.operationalEntrypoints;
  assert.equal(new Set(items.map(item => item.area)).size, items.length);
  assert.ok(items.length >= 6);

  for (const item of items) {
    assert.ok(item.href.startsWith('/') && !item.href.startsWith('/admin'), item.href);
    const folder = join(app, item.href.slice(1));
    assert.ok(existsSync(join(folder, 'page.tsx')), item.href);
    const layout = readFileSync(join(folder, 'layout.tsx'), 'utf8');
    assert.match(layout, /requirePortalSession\('admin'/);
    assert.ok(item.label && item.detail);
  }
});

test('all existing legacy internal workspaces receive a server session guard', () => {
  const internalAreas = [
    'product', 'commerce', 'production', 'inventory', 'dealers',
    'supply', 'finance', 'logistics', 'partners', 'vehicle360',
    'people', 'overview', 'settings',
  ];
  for (const area of internalAreas) {
    const guard = readFileSync(join(app, area, 'layout.tsx'), 'utf8');
    assert.ok(guard.includes("requirePortalSession('admin', '/" + area + "')"), area);
  }
});
