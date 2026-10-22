'use client';

import { useEffect, useState } from 'react';
import { HomepageProductBindingPanel } from '../product/homepage-product-binding-panel';
import { CatalogPublicationPanel } from '../product/catalog-publication-panel';
import { StorefrontOrderDraftPanel } from '../commerce/storefront-orders-panel';
import { EcommerceInventoryPanel } from './ecommerce-inventory-panel';

type Model = { id: string; code: string; name: string; status: string; product_type_code: string };

/** Navigation-only reorganization. The underlying data is still owned by Product
 * and Commerce; this workspace only composes the existing authorized API panels. */
export function EcommerceAdminWorkspace() {
  const [models, setModels] = useState<Model[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus('loading');
      try {
        const response = await fetch('/api/control/v1/product/catalog', { cache: 'no-store' });
        const payload = await response.json().catch(() => null) as { data?: { models?: Model[] }; message?: string } | null;
        if (!response.ok) throw new Error(response.status === 403 ? '当前账户无权查看商品主数据' : payload?.message ?? '商品列表读取失败');
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
  }, []);

  return <div className="av-live-operations" aria-label="电商真实业务工作区">
    <div className="av-card">
      <p className="av-eyebrow">ALSVID COMMERCE OPERATIONS</p>
      <h2 className="av-cardtitle">自建商城 · 运营中心</h2>
      <p className="av-cardhint">这里集中管理官网商品发布、首页展示、DE/AT 售价与 B2C 商城订单。型号 / SKU 仍由产品中心创建；价格、库存与订单始终使用各自领域的唯一真实记录。</p>
      <p className="av-cardhint">首期公开支付尚未启用。未接入的优惠券、营销活动、支付配置等功能不提供假操作入口。</p>
      <a href="/admin/product#model-register">查看产品主数据</a> · <a href="/admin/finance">财务与结算</a>
    </div>
    {status === 'loading' ? <p role="status">正在读取产品主数据与商城发布信息…</p> : null}
    {status === 'error' ? <div className="av-card" role="alert">无法加载产品主数据：{error}。这不表示商品数量为零；商城订单及已有价格记录仍可独立查看。</div> : null}
    {status === 'ready' ? <>
      <section id="homepage" aria-label="首页商品绑定"><HomepageProductBindingPanel models={models} loadError="" /></section>
      <section id="publications" aria-label="官网商品审核与发布"><CatalogPublicationPanel models={models} /></section>
    </> : null}
    <EcommerceInventoryPanel />
    <StorefrontOrderDraftPanel />
  </div>;
}
