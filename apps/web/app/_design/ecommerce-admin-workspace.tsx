'use client';

import { useEffect, useState } from 'react';
import { HomepageProductBindingPanel } from '../product/homepage-product-binding-panel';
import { CatalogPublicationPanel } from '../product/catalog-publication-panel';
import { StorefrontOrderDraftPanel } from '../commerce/storefront-orders-panel';
import { EcommerceInventoryPanel } from './ecommerce-inventory-panel';

type Model = { id: string; code: string; name: string; status: string; product_type_code: string };

const sections = [
  { href: '#homepage', label: '首页商品绑定', detail: '官网展示位置与产品 ID' },
  { href: '#publications', label: '商品审核与发布', detail: '商品资料、审核与公开状态' },
  { href: '#inventory', label: '库存查询', detail: 'SKU 库位与 VIN 整车分开展示' },
  { href: '#b2c', label: '售价与订单', detail: 'DE / AT 售价及内部订单流程' },
  { href: '#commerce-next', label: '后续功能', detail: '清晰查看尚未开放的能力' },
] as const;

/** Commerce workspace composes authorized Product, Inventory and Commerce capabilities.
 * This is a navigation and status layer only: domain data remains owned by its source domain. */
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
  }, []);

  return <div className="av-live-operations av-commerce-workspace" aria-label="电商真实业务工作区">
    <section className="av-card av-commerce-overview" id="commerce-overview" aria-label="电商运营概览">
      <div className="av-commerce-overview-copy">
        <p className="av-eyebrow">ALSVID COMMERCE OPERATIONS</p>
        <h2 className="av-cardtitle">自建商城 · 运营中心</h2>
        <p className="av-cardhint">集中管理官网商品发布、首页展示、德国/奥地利售价、库存查询与 B2C 订单。型号、Variant 和 SKU 由产品中心维护；库存、价格、订单与财务分别保留各自的唯一真实记录。</p>
      </div>
      <div className="av-commerce-overview-links">
        <a className="av-btn" href="/admin/product#model-register">产品主数据</a>
        <a className="av-btn" href="/admin/finance">财务与结算</a>
      </div>
      <div className="av-commerce-boundary" role="note">
        <strong>当前交易边界</strong>
        <span>内部价格与订单草稿可以管理；公开结账、真实收款和自动库存预留尚未开放。未接入功能不会显示成可执行按钮。</span>
      </div>
    </section>

    <nav className="av-commerce-nav" aria-label="电商模块功能导航">
      {sections.map(section => <a href={section.href} key={section.href}>
        <strong>{section.label}</strong>
        <span>{section.detail}</span>
      </a>)}
    </nav>

    {status === 'error' ? <div className="av-card" role="alert">无法加载产品主数据：{error}。这不表示商品数量为零；库存、价格和已有订单仍由各自领域接口独立查询。</div> : null}
    <section id="homepage" aria-label="首页商品绑定">
      {status === 'ready' ? <HomepageProductBindingPanel models={models} loadError="" /> : <p className="av-cardhint" role="status">{status === 'loading' ? '正在读取首页绑定所需的产品主数据…' : '产品主数据读取失败，首页绑定操作暂不可用。'}</p>}
    </section>
    <section id="publications" aria-label="官网商品审核与发布">
      {status === 'ready' ? <CatalogPublicationPanel models={models} /> : <p className="av-cardhint" role="status">{status === 'loading' ? '正在读取商品发布所需的产品主数据…' : '产品主数据读取失败，商品发布操作暂不可用。'}</p>}
    </section>
    <EcommerceInventoryPanel />
    <StorefrontOrderDraftPanel />

    <section id="commerce-next" className="av-card av-commerce-roadmap" aria-label="电商后续功能与交付状态">
      <div className="av-commerce-roadmap-head">
        <div>
          <p className="av-eyebrow">NEXT DELIVERY · NO MOCK ACTIONS</p>
          <h2 className="av-cardtitle">电商后续功能</h2>
          <p className="av-cardhint">这里展示真实建设边界，不代表这些能力已经上线。每项功能需要补齐领域 API、权限、失败处理和验收后，才会开放操作。</p>
        </div>
      </div>
      <div className="av-commerce-roadmap-grid">
        <article className="av-commerce-roadmap-item">
          <div><h3>可售库存 ATP</h3><span data-state="pending">待开发</span></div>
          <p>结合商品发布状态、SKU、DE/AT 市场、仓库履约资格和预留量计算可售库存。现有台账可用量不能直接作为商城可售量。</p>
        </article>
        <article className="av-commerce-roadmap-item">
          <div><h3>公开结账与 PSP 支付</h3><span data-state="blocked">暂未开放</span></div>
          <p>需先选定并接入支付服务商，完成服务端金额/币种核验、回调签名、幂等、防重放、退款和端到端验收。</p>
        </article>
        <article className="av-commerce-roadmap-item">
          <div><h3>促销与优惠券</h3><span data-state="pending">待开发</span></div>
          <p>包括适用商品、市场、有效期、使用限制和价格计算。未建立服务端规则前不提供可点击的假配置。</p>
        </article>
        <article className="av-commerce-roadmap-item">
          <div><h3>退货、换货与退款协同</h3><span data-state="pending">待开发</span></div>
          <p>订单、售后工单、仓库退货与 Finance 退款必须按关联 ID 协同，不复制订单或直接伪造资金状态。</p>
        </article>
        <article className="av-commerce-roadmap-item">
          <div><h3>完整订单履约时间线</h3><span data-state="pending">待开发</span></div>
          <p>整合订单状态、已核验支付、仓库发运和物流节点；每个状态显示来源与更新时间。</p>
        </article>
        <article className="av-commerce-roadmap-item">
          <div><h3>商品分类与商城内容扩展</h3><span data-state="pending">待开发</span></div>
          <p>扩展整车、配件与维修零件的目录、筛选和详情内容，继续引用产品中心的唯一商品主数据。</p>
        </article>
      </div>
    </section>
  </div>;
}
