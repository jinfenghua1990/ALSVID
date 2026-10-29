'use client';

import { useEffect, useState } from 'react';

type Model = { id: string; code: string; name: string; status: string; product_type_code: string };
type Publication = { model_id: string; model_code: string; status: string; updated_at?: string };
type Summary = { skus: { id: string }[]; prices: { skuId: string; status: string }[]; orders: { id: string; orderNumber: string; status: string; marketCountry: string; totalGrossAmount: string; createdAt: string }[]; orderTotal: number; orderStatusCounts: Record<string, number> };
type WorkbenchData = { models: Model[]; publications: Publication[]; summary: Summary };

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  const payload = await response.json().catch(() => null) as { data?: T; message?: string } | null;
  if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请重新登录' : response.status === 403 ? '当前账号没有商城数据读取权限' : payload?.message ?? '工作台数据读取失败');
  if (!payload || !('data' in payload)) throw new Error('工作台接口返回格式异常');
  return payload.data as T;
}

const orderLabel: Record<string, string> = { DRAFT: '内部草稿', SUBMITTED: '待支付', PAYMENT_PENDING: '支付处理中', FULFILLMENT_PENDING: '待履约', IN_PRODUCTION: '生产中', FULFILLED: '已交付', CANCELLED: '已取消' };

export function EcommerceWorkbench() {
  const [data, setData] = useState<WorkbenchData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  async function load() {
    setState('loading');
    setError('');
    try {
      const [catalog, publications, summary] = await Promise.all([
        read<{ models: Model[] }>('/api/control/v1/product/catalog'),
        read<Publication[]>('/api/control/v1/product/publications'),
        read<Summary>('/api/control/v1/commerce/storefront/summary'),
      ]);
      setData({ models: catalog.models, publications, summary });
      setState('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '工作台数据读取失败');
      setState('error');
    }
  }

  useEffect(() => { void load(); }, []);

  if (state === 'loading') return <section className="av-card av-commerce-load-state" role="status"><strong>正在读取电商工作台…</strong><p>正在读取真实商品发布、价格和 B2C 订单状态。</p></section>;
  if (state === 'error') return <section className="av-card av-commerce-load-state" role="alert"><strong>工作台数据暂不可用</strong><p>{error}。失败来源不会按零计算。</p><button className="av-btn" type="button" onClick={() => void load()}>重新读取</button></section>;
  if (!data) return null;

  const published = data.publications.filter(item => item.status === 'PUBLISHED');
  const review = data.publications.filter(item => item.status === 'IN_REVIEW');
  const distribution = Object.entries(data.publications.reduce<Record<string, number>>((result, item) => { result[item.status] = (result[item.status] ?? 0) + 1; return result; }, {}));
  const pendingOrders = data.summary.orders.filter(order => ['SUBMITTED', 'PAYMENT_PENDING', 'FULFILLMENT_PENDING'].includes(order.status));

  return <div className="av-commerce-workspace" aria-label="电商运营工作台">
    <section className="av-card av-commerce-dashboard-head"><div><p className="av-eyebrow">ALSVID COMMERCE OPERATIONS</p><h1 className="av-cardtitle">电商工作台</h1><p>商品发布、价格、库存查询和第一方 B2C 订单各自使用原有业务数据。这里集中查看运营状态，不复制商品、SKU 或库存主数据。</p></div><div className="av-pageactions"><button className="av-btn" type="button" onClick={() => void load()}>刷新数据</button><a className="av-btn" data-variant="primary" href="/admin/ecommerce/products">进入商城商品列表 →</a></div></section>
    <section className="av-card" aria-label="商城经营概览"><div className="av-cardhead"><div><h2 className="av-cardtitle">当前经营概览</h2><p className="av-cardhint">数字来自真实商品发布和第一方商城订单接口；未接入的可售量不显示虚假数字。</p></div></div><dl className="av-commerce-metric-grid">{[
      ['在售商品', published.length, '正式发布记录'],
      ['待审核商品', review.length, '等待发布审核'],
      ['库存异常商品', '数据未接入', 'ATP / 市场规则尚未接入'],
      ['待处理 B2C 订单', pendingOrders.length, '待支付或待履约状态'],
    ].map(([label, value, hint]) => <div className="av-commerce-metric" key={String(label)}><dt>{label}</dt><dd>{value}</dd><small>{hint}</small></div>)}</dl></section>
    <section className="av-card" aria-label="商品发布状态"><div className="av-cardhead"><div><h2 className="av-cardtitle">商品发布状态</h2><p className="av-cardhint">{data.models.length} 条产品主数据，{data.publications.length} 条商城发布记录。</p></div><a className="av-more" href="/admin/ecommerce/products">查看商品列表 →</a></div><div className="av-tablewrap"><table className="av-table"><thead><tr><th>状态</th><th>数量</th><th>下一步</th></tr></thead><tbody>{[['PUBLISHED', '已上架', '维护价格与库存'], ['IN_REVIEW', '待审核', '进入发布审核'], ['DRAFT', '草稿', '补充展示资料'], ['WITHDRAWN', '已下架', '重新审核后发布']].map(([key, label, next]) => <tr key={key}><td><span className="av-tag">{label}</span></td><td>{distribution.find(([status]) => status === key)?.[1] ?? 0}</td><td>{next}</td></tr>)}</tbody></table></div></section>
    <section className="av-card" aria-label="待处理订单"><div className="av-cardhead"><div><h2 className="av-cardtitle">待处理 B2C 订单</h2><p className="av-cardhint">公开结账和 PSP 支付仍由现有订单流程控制；此处只显示真实订单状态。</p></div><a className="av-more" href="/admin/ecommerce/orders">进入订单管理 →</a></div>{pendingOrders.length ? <div className="av-tablewrap"><table className="av-table"><thead><tr><th>订单号</th><th>市场</th><th>状态</th><th>金额</th><th>创建时间</th></tr></thead><tbody>{pendingOrders.slice(0, 20).map(order => <tr key={order.id}><td><strong>{order.orderNumber}</strong></td><td>{order.marketCountry}</td><td>{orderLabel[order.status] ?? order.status}</td><td>{order.totalGrossAmount}</td><td>{new Date(order.createdAt).toLocaleString('zh-CN')}</td></tr>)}</tbody></table></div> : <p className="av-empty-state">当前没有待支付或待履约的第一方 B2C 订单。</p>}</section>
    <section className="av-card av-commerce-boundary"><strong>数据边界</strong><span>商品与 SKU 由产品研发维护，库存由库存管理维护，商城价格和订单由商城交易域维护。营销活动、支付配置、ATP 可售判定和库存同步异常列表尚未接入，页面不会用示例数据填充。</span></section>
  </div>;
}

