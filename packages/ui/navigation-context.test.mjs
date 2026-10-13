import assert from 'node:assert/strict';
import test from 'node:test';
import { contextualHref, resolveNavigation } from './src/navigation-context.ts';

const navigation = [
  { label: '工作台', href: '/admin', area: '工作台' },
  { label: '今日概览', href: '/overview', area: '工作台', active: true },
  { label: '订单', href: '/commerce', area: '订单' },
  { label: '外部订单事实', href: '/commerce', area: '订单' },
  { label: '订单履约状态', href: '/logistics', area: '订单' },
  { label: '数据', href: '/overview', area: '数据', active: true },
  { label: '销售分析', href: '/overview#sales', area: '数据' },
  { label: '生产与库存分析', href: '/overview#operations', area: '数据' },
];

test('shared destination retains the selected top-level module after reload', () => {
  const context = resolveNavigation(navigation, contextualHref('/overview', '数据'));
  assert.equal(context.activeArea, '数据');
  assert.deepEqual(context.contextualNavigation.map(item => item.label), ['销售分析', '生产与库存分析']);
  assert.deepEqual(context.areas.filter(item => item.active).map(item => item.label), ['数据']);
});

test('a secondary destination keeps its owning module and one active item', () => {
  const context = resolveNavigation(navigation, contextualHref('/logistics', '订单'));
  assert.equal(context.activeArea, '订单');
  assert.deepEqual(context.contextualNavigation.map(item => item.label), ['外部订单事实', '订单履约状态']);
  assert.deepEqual(context.contextualNavigation.filter(item => item.active).map(item => item.label), ['订单履约状态']);
});

test('hash targets and existing query parameters survive contextual links', () => {
  const url = new URL(contextualHref('/overview?filter=open#sales', '数据'), 'https://alsvid.invalid');
  assert.equal(url.searchParams.get('filter'), 'open');
  assert.equal(url.searchParams.get('nav'), '数据');
  assert.equal(url.hash, '#sales');
  const context = resolveNavigation(navigation, url.href);
  assert.equal(context.contextualNavigation.find(item => item.active)?.label, '销售分析');
});

test('unknown or entirely disabled modules cannot become the active module', () => {
  const items = [...navigation, { label: '规划', href: '/future', area: '规划', disabled: true }];
  for (const area of ['不存在', '规划']) {
    assert.equal(resolveNavigation(items, contextualHref('/overview', area)).activeArea, '工作台');
  }
  assert.equal(resolveNavigation(items).areas.find(item => item.label === '规划')?.disabled, true);
});
