import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TODO_SOURCES,
  mergeTodoItems,
  parseTodoSource,
} from './live-workbench-todos-contract.ts';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, name), 'utf8');
const time = '2026-10-25 23:30:00';

test('todo sources map to existing authenticated Admin business APIs', () => {
  assert.deepEqual(TODO_SOURCES.map((item) => item.path), [
    '/v1/product/publications',
    '/v1/service/cases',
    '/v1/commerce/storefront/summary',
  ]);
  assert.deepEqual(TODO_SOURCES.map((item) => item.href), [
    '/admin/ecommerce/publications',
    '/admin/after-sales',
    '/admin/ecommerce/orders',
  ]);
  const api = join(here, '..', '..', '..', 'api', 'src');
  assert.match(readFileSync(join(api, 'product.controller.ts'), 'utf8'), /@Get\('publications'\)/);
  assert.match(readFileSync(join(api, 'service-cases.controller.ts'), 'utf8'), /@Controller\('v1\/service\/cases'\)/);
  assert.match(readFileSync(join(api, 'storefront-orders.controller.ts'), 'utf8'), /@Get\('summary'\)/);
});

test('publication todos only include draft and in-review records', () => {
  const source = TODO_SOURCES.find((item) => item.key === 'publications');
  const parsed = parseTodoSource(source, {
    data: [
      { model_id: 'm1', model_code: 'FC1', status: 'DRAFT' },
      { model_id: 'm2', model_code: 'FC2', status: 'IN_REVIEW' },
      { model_id: 'm3', model_code: 'CT1', status: 'PUBLISHED' },
      { model_id: 'm4', model_code: 'GT1', status: 'WITHDRAWN' },
    ],
  }, time);
  assert.equal(parsed.state, 'ready');
  assert.deepEqual(parsed.items.map((item) => item.title), ['FC1 · 商品发布', 'FC2 · 商品发布']);
  assert.deepEqual(parsed.items.map((item) => item.status), ['草稿待完善', '待审核发布']);
});

test('service and storefront parsers keep open work only and never invent zeros from bad payloads', () => {
  const cases = TODO_SOURCES.find((item) => item.key === 'service-cases');
  const orders = TODO_SOURCES.find((item) => item.key === 'storefront-orders');

  const open = parseTodoSource(cases, {
    data: [
      { id: 'c1', caseNumber: 'SR-1', title: '异响', status: 'NEW' },
      { id: 'c2', caseNumber: 'SR-2', title: '完结', status: 'CLOSED' },
    ],
  }, time);
  assert.equal(open.state, 'ready');
  assert.equal(open.items.length, 1);
  assert.equal(open.items[0].status, '待受理');

  const attention = parseTodoSource(orders, {
    data: {
      orders: [
        { id: 'o1', orderNumber: 'SO-1', status: 'SUBMITTED' },
        { id: 'o2', orderNumber: 'SO-2', status: 'PAYMENT_VERIFIED' },
        { id: 'o3', orderNumber: 'SO-3', status: 'DRAFT' },
      ],
      prices: [],
    },
  }, time);
  assert.equal(attention.state, 'ready');
  assert.deepEqual(attention.items.map((item) => item.title), ['SO-1 · 自建商城订单', 'SO-3 · 自建商城订单']);

  assert.equal(parseTodoSource(cases, null, time).state, 'unavailable');
  assert.equal(parseTodoSource(orders, { data: {} }, time).state, 'unavailable');
  assert.equal(parseTodoSource(orders, { data: { orders: null } }, time).state, 'unavailable');
});

test('merge keeps ready items and counts blocked sources separately', () => {
  const merged = mergeTodoItems([
    { state: 'ready', items: [{ id: 'a', source: 'publications', title: 'A', status: '草稿待完善', href: '/admin/ecommerce/publications', detail: 'x' }], checkedAt: time },
    { state: 'unauthorized', reason: 'permission' },
    { state: 'unavailable', reason: 'down' },
  ]);
  assert.equal(merged.items.length, 1);
  assert.equal(merged.readyCount, 1);
  assert.equal(merged.blocked, 2);
});

test('workbench mounts live todos ahead of fixture task blocks and stays read-only', () => {
  const renderer = read('renderer.tsx');
  const component = read('live-workbench-todos.tsx');
  assert.match(renderer, /<LiveWorkbenchTodos \/>/);
  assert.ok(renderer.indexOf('<LiveWorkbenchTodos />') < renderer.indexOf("block.kind !== 'tasks'"));
  assert.match(component, /\/api\/control/);
  assert.match(component, /cache: 'no-store'/);
  assert.doesNotMatch(component, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
  assert.match(component, /response\.status === 401/);
  assert.match(component, /response\.status === 403/);
  assert.match(component, /不按 0 条待办计算/);
});
