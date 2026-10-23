'use client';

import { useEffect, useState } from 'react';
import { HomepageProductBindingPanel } from '../product/homepage-product-binding-panel';
import { CatalogPublicationPanel } from '../product/catalog-publication-panel';
import { StorefrontOrderDraftPanel } from '../commerce/storefront-orders-panel';
import { EcommerceInventoryPanel } from './ecommerce-inventory-panel';

type Model = { id: string; code: string; name: string; status: string; product_type_code: string };
type EcommerceView = 'overview' | 'publications' | 'homepage' | 'inventory' | 'pricing' | 'orders';

const shortcuts = [
  { href: '/admin/ecommerce/publications', category: '商品管理', title: '官网商品发布与审核', description: '维护中、德、英商品标题，核对实物图，管理审核和正式发布状态。', action: '进入商品管理' },
  { href: '/admin/ecommerce/homepage', category: '商品管理', title: '首页商品绑定', description: '将官网首页展示位关联到真实 Model ID，支持自动匹配与手动指定。', action: '管理首页展示' },
  { href: '/admin/ecommerce/inventory', category: '库存查询', title: '电商库存查询', description: '查看 SKU 库位和 VIN 整车库存；只读查询，不重复维护库存账本。', action: '查询库存' },
  { href: '/admin/ecommerce/pricing', category: '商城交易', title: '商城价格管理', description: '按 SKU 和德国 / 奥地利市场维护 EUR 含税价格版本。', action: '管理价格' },
  { href: '/admin/ecommerce/orders', category: '商城交易', title: 'B2C 订单管理', description: '创建内部订单草稿、筛选第一方订单并查看订单状态和流转记录。', action: '管理订单' },
] as const;

const plannedCapabilities = [
  { title: '可售库存 ATP', state: 'pending', detail: '结合发布状态、市场、仓库履约资格和预留量进行服务端判定。' },
  { title: '公开结账与 PSP 支付', state: 'blocked', detail: '支付服务商、金额校验、回调验签和退款闭环验收前保持关闭。' },
  { title: '促销与优惠券', state: 'pending', detail: '待补齐适用商品、市场、有效期和服务端价格规则。' },
] as const;

function viewForRoute(route: string): EcommerceView {
  const path = (route.split('?')[0] ?? route).replace(/\/+$/, '');
  if (path === '/admin/ecommerce/publications') return 'publications';
  if (path === '/admin/ecommerce/homepage') return 'homepage';
  if (path === '/admin/ecommerce/inventory') return 'inventory';
  if (path === '/admin/ecommerce/pricing') return 'pricing';
  if (path === '/admin/ecommerce/orders') return 'orders';
  return 'overview';
}

/** Commerce workspace composes authorized Product, Inventory and Commerce capabilities.
 * Each operational area has its own route; domain data remains owned by its source domain. */
export function EcommerceAdminWorkspace({ route = '/admin/ecommerce' }: { route?: string }) {
  const view = viewForRoute(route);
  const needsModels = view === 'homepage' || view === 'publications';
  const [models, setModels] = useState<Model[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!needsModels) {
      setStatus('ready');
      setError('');
      return;
    }
    let active = true;
    async function load() {
      setStatus('loading');
      try {
        const response = await fetch('/api/control/v1/product/catalog', { cache: 'no-store' });
        const payload = await response.json().catch(() => null) as { data?: { models?: Model[] }; message?: string } | null;
        if (!response.ok) throw new Error(response.status === 401 ? '登录已失效，请重新登录' : response.status === 403 ? '当前账户无权查看商品主数据' : payload?.message ?? '商品列表读取失败');
        if (!Array.isArray(payload?.data?.models)) throw new Error('商品目录接口返回格式异常');
        if (active) {
          setModels(payload.data.models);
          setError('');
          setStatus('ready');
        }
      } catch (reason) {
        if (active) {
          setError(reason instanceof Error ? reason.message : '商品目录读取失败');
          setStatus('error');
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [needsModels]);

  if (view === 'overview') {
    return <div className="av-live-operations av-commerce-workspace" aria-label="电商运营工作台">
      <section className="av-card av-commerce-dashboard-head" aria-label="电商运营概览">
        <div>
          <p className="av-eyebrow">ALSVID COMMERCE OPERATIONS</p>
          <h1 className="av-cardtitle">电商运营工作台</h1>
          <p>商品发布、首页展示、库存查询、DE / AT 售价与第一方 B2C 订单各自独立管理。商品主数据、库存账本、价格版本和订单记录仍由各自领域负责。</p>
        </div>
        <span className="av-commerce-market-chip">德国 DE · 奥地利 AT · EUR</span>
      </section>
      <section className="av-commerce-shortcut-grid" aria-label="电商功能入口">
        {shortcuts.map(item => <a className="av-commerce-shortcut" href={item.href} key={item.href}>
          <span className="av-commerce-shortcut-kicker">{item.category}</span>
          <strong>{item.title}</strong>
          <span className="av-commerce-shortcut-description">{item.description}</span>
          <span className="av-commerce-shortcut-action">{item.action} <span aria-hidden="true">→</span></span>
        </a>)}
      </section>
      <section className="av-commerce-boundary" role="note" aria-label="当前交易边界">
        <strong>当前交易边界</strong>
        <span>台账可用量不等于商城可售量。公开结账、真实收款、自动库存预留和生产联动尚未开放；未验收的能力不会显示成可执行操作。</span>
      </section>
      <section className="av-card av-commerce-roadmap-compact" aria-label="尚未开放的电商能力">
        <div>
          <p className="av-eyebrow">NEXT DELIVERY</p>
          <h2 className="av-cardtitle">后续能力（尚未开放）</h2>
          <p className="av-cardhint">以下项目需要补齐领域 API、权限、失败恢复与业务验收后才会开放。</p>
        </div>
        <ul>
          {plannedCapabilities.map(item => <li data-state={item.state} key={item.title}>
            <div><strong>{item.title}</strong><span>{item.state === 'blocked' ? '暂未开放' : '待开发'}</span></div>
            <p>{item.detail}</p>
          </li>)}
        </ul>
      </section>
    </div>;
  }

  if (view === 'inventory') return <div className="av-live-operations av-commerce-workspace" aria-label="电商库存查询工作区"><EcommerceInventoryPanel /></div>;
  if (view === 'pricing') return <div className="av-live-operations av-commerce-workspace" aria-label="商城价格管理工作区"><StorefrontOrderDraftPanel mode="pricing" /></div>;
  if (view === 'orders') return <div className="av-live-operations av-commerce-workspace" aria-label="B2C 订单管理工作区"><StorefrontOrderDraftPanel mode="orders" /></div>;

  return <div className="av-live-operations av-commerce-workspace" aria-label={view === 'homepage' ? '首页商品绑定工作区' : '官网商品发布与审核工作区'}>
    {status === 'loading' ? <section className="av-card av-commerce-load-state" role="status"><strong>正在读取产品主数据…</strong><p>正在核对真实型号与商品发布记录，请稍候。</p></section> : null}
    {status === 'error' ? <section className="av-card av-commerce-load-state" role="alert">
      <strong>产品主数据暂不可用</strong>
      <p>{error}。读取失败不代表商品数量为零；为避免误操作，本页面暂不开放依赖产品主数据的操作。</p>
      <a className="av-btn" href="/admin/product#model-register">前往产品研发检查 →</a>
    </section> : null}
    {status === 'ready' && view === 'homepage' ? <HomepageProductBindingPanel models={models} loadError="" /> : null}
    {status === 'ready' && view === 'publications' ? <CatalogPublicationPanel models={models} /> : null}
  </div>;
}
