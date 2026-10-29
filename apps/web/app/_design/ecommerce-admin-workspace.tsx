'use client';

import { useEffect, useState } from 'react';
import { HomepageProductBindingPanel } from '../product/homepage-product-binding-panel';
import { CatalogPublicationPanel } from '../product/catalog-publication-panel';
import { StorefrontOrderDraftPanel } from '../commerce/storefront-orders-panel';
import { EcommerceInventoryPanel } from './ecommerce-inventory-panel';
import { StorefrontReadinessPanel } from './storefront-readiness-panel';

type Model = { id: string; code: string; name: string; status: string; product_type_code: string };
type EcommerceView = 'overview' | 'publications' | 'homepage' | 'inventory' | 'pricing' | 'orders';

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

  if (view === 'overview') return null;

  if (view === 'inventory') return <div className="av-live-operations av-commerce-workspace" aria-label="电商库存查询工作区">
    <StorefrontReadinessPanel />
    <EcommerceInventoryPanel />
  </div>;
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
