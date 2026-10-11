'use client';

import { AppShell } from '@alsvid/ui';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { navigationFor } from '../app-navigation';
import styles from './commerce.module.css';

type Partner = { id: string; partnerCode: string; displayName: string; roles: string[] };
type Sku = { id: string; sku: string; name: string };
type Shipment = { id: string; shipment_number: string; status: string };
type Channel = { id: string; provider: 'SHOPIFY' | 'AMAZON' | 'OTHER'; channel_key: string; display_name: string; external_account_id: string; default_dealer_partner_id: string | null; requires_dealer: boolean; enabled: boolean };
type Order = { id: string; channel_id: string; channel_key: string; channel_name: string; external_order_id: string; external_order_name: string | null; external_customer_id: string | null; dealer_partner_id: string | null; customer_partner_id: string | null; dealer_name: string | null; customer_name: string | null; order_status: string; financial_status: string | null; fulfillment_status: string | null; currency: string; subtotal_amount: string; total_amount: string; source_updated_at: string | null };
type Line = { id: string; order_id: string; external_line_id: string; external_product_id?: string | null; external_variant_id: string | null; external_sku: string | null; title: string; quantity: string; unit_price: string; currency: string; mapped_sku: string | null; mapped_sku_name: string | null; mapping_source: string };
type Fulfillment = { id: string; order_id: string; external_fulfillment_id: string; fulfillment_status: string; tracking_company: string | null; tracking_number: string | null; logistics_shipment_id: string | null; shipment_number: string | null };
type Exception = { id: string; channel_id: string; channel_key: string; exception_type: string; entity_type: string; entity_id: string; external_reference: string | null; message: string; status: string; created_at: string };
type Receipt = { id: string; channel_id: string; channel_key: string; provider_event_id: string; provider_correlation_id: string | null; topic: string; source_account: string | null; provider_api_version: string | null; received_at: string };
type Attempt = { id: string; receipt_id: string; provider_event_id: string; topic: string; outcome: string; message: string; attempt_number: number; occurred_at: string };
type CommerceSummary = { channels: Channel[]; orders: Order[]; lines: Line[]; fulfillments: Fulfillment[]; exceptions: Exception[]; mappings: unknown[]; fulfillmentLines: unknown[]; exceptionEvents: unknown[] };
type IntegrationSummary = { receipts: Receipt[]; attempts: Attempt[]; cursors: unknown[] };

const emptyCommerce: CommerceSummary = { channels: [], orders: [], lines: [], fulfillments: [], exceptions: [], mappings: [], fulfillmentLines: [], exceptionEvents: [] };
const emptyIntegrations: IntegrationSummary = { receipts: [], attempts: [], cursors: [] };

function providerLabel(provider: Channel['provider'] | string) {
  if (provider === 'SHOPIFY') return 'Shopify';
  if (provider === 'AMAZON') return 'Amazon';
  return '其他渠道';
}

function statusLabel(status: string | null | undefined) {
  if (!status) return '未设置';
  const labels: Record<string, string> = {
    OPEN: '待处理', RESOLVED: '已解决', IGNORED: '已忽略', PROCESSED: '已处理', NOOP: '无变更', REJECTED: '已拒绝',
    UNMAPPED: '未映射', MANUAL: '人工映射', AUTO_VARIANT: '自动映射', ENABLED: '启用', DISABLED: '停用',
  };
  return labels[status] ?? status;
}

export default function CommerceClient() {
  const router = useRouter();
  const [commerce, setCommerce] = useState<CommerceSummary>(emptyCommerce);
  const [integrations, setIntegrations] = useState<IntegrationSummary>(emptyIntegrations);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [message, setMessage] = useState('');

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('登录状态已过期，请重新登录');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function reload() {
    try {
      const [nextCommerce, nextIntegrations, nextPartners, product, logistics] = await Promise.all([
        api('/v1/commerce'), api('/v1/integrations'), api('/v1/partners'), api('/v1/product'), api('/v1/logistics'),
      ]);
      setCommerce(nextCommerce);
      setIntegrations(nextIntegrations);
      setPartners(nextPartners);
      setSkus(product.skus ?? []);
      setShipments(logistics.shipments ?? []);
      setSelectedOrderId((current) => current || nextCommerce.orders[0]?.id || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法加载电商渠道工作台');
    }
  }

  useEffect(() => { void reload(); }, []);

  const dealerPartners = partners.filter((item) => item.roles.includes('DEALER'));
  const customerPartners = partners.filter((item) => item.roles.includes('CUSTOMER'));
  const selectedOrder = commerce.orders.find((item) => item.id === selectedOrderId) ?? commerce.orders[0] ?? null;
  const orderLines = selectedOrder ? commerce.lines.filter((item) => item.order_id === selectedOrder.id) : [];
  const orderFulfillments = selectedOrder ? commerce.fulfillments.filter((item) => item.order_id === selectedOrder.id) : [];
  const openExceptions = commerce.exceptions.filter((item) => item.status === 'OPEN');
  const shopifyChannels = commerce.channels.filter((item) => item.provider === 'SHOPIFY');
  const amazonChannels = commerce.channels.filter((item) => item.provider === 'AMAZON');
  const metrics = useMemo(() => ({
    channels: commerce.channels.length,
    orders: commerce.orders.length,
    open: openExceptions.length,
    unmapped: commerce.lines.filter((item) => !item.mapped_sku).length,
  }), [commerce, openExceptions]);

  async function action(path: string, body: unknown = {}) {
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage('操作已完成。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    const provider = String(form.get('provider')) as Channel['provider'];
    const dealer = String(form.get('defaultDealerPartnerId') ?? '');
    const marketplace = String(form.get('marketplace') ?? '').trim();
    try {
      await api('/v1/commerce/channels', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          channelKey: form.get('channelKey'),
          displayName: form.get('displayName'),
          externalAccountId: form.get('externalAccountId'),
          requiresDealer: form.get('requiresDealer') === 'on',
          ...(dealer ? { defaultDealerPartnerId: dealer } : {}),
          metadata: provider === 'AMAZON'
            ? { adapter: 'SP_API', integrationStatus: 'UNCONFIGURED', ...(marketplace ? { marketplace } : {}) }
            : {},
        }),
      });
      target.reset();
      setMessage(provider === 'AMAZON' ? 'Amazon 渠道已登记；SP-API 仍处于待配置状态。' : 'Shopify 渠道已登记。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法登记渠道');
    }
  }

  async function mapVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    try {
      await api('/v1/commerce/mappings/variant', {
        method: 'POST',
        body: JSON.stringify({
          channelId: form.get('channelId'),
          externalProductId: form.get('externalProductId') || undefined,
          externalVariantId: form.get('externalVariantId'),
          externalSku: form.get('externalSku') || undefined,
          skuId: form.get('skuId'),
        }),
      });
      target.reset();
      setMessage('外部商品映射已保存。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法保存商品映射');
    }
  }

  async function ingestShopify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const payload = JSON.parse(String(form.get('payload') ?? '{}')) as Record<string, unknown>;
      await api(`/v1/integrations/shopify/${form.get('channelId')}/ingest`, {
        method: 'POST',
        body: JSON.stringify({
          webhookId: form.get('webhookId'), eventId: form.get('eventId') || undefined, topic: form.get('topic'),
          shopDomain: form.get('shopDomain'), apiVersion: form.get('apiVersion') || undefined,
          triggeredAt: new Date().toISOString(), payload,
        }),
      });
      setMessage('Shopify 交付证据已写入并完成规范化处理。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法写入 Shopify 交付证据');
    }
  }

  async function mapPartners(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder) return;
    const form = new FormData(event.currentTarget);
    const dealer = String(form.get('dealerPartnerId') ?? '');
    const customer = String(form.get('customerPartnerId') ?? '');
    await action(`/v1/commerce/orders/${selectedOrder.id}/partners`, { dealerPartnerId: dealer || null, customerPartnerId: customer || null });
  }

  function latestAttempt(receiptId: string) {
    return integrations.attempts.filter((item) => item.receipt_id === receiptId).sort((a, b) => b.attempt_number - a.attempt_number)[0] ?? null;
  }

  function channelFor(id: string) {
    return commerce.channels.find((item) => item.id === id);
  }

  return (
    <AppShell navigation={navigationFor('/commerce')} footer="Commerce / 外部渠道 / 对账">
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>电商渠道 / Commerce</div>
          <h1>一个 Commerce，连接 Shopify、Amazon 和后续渠道。</h1>
          <p>订单、支付与履约状态仍由外部平台负责；ALSVID 统一保存规范化事实、SKU/Partner/物流映射与异常对账，不重建第二套商城或 Seller Central。</p>
        </div>
        <div className={styles.releaseBadge}>多渠道骨架</div>
      </header>

      {message ? <div className={styles.notice}>{message}</div> : null}

      <section className={styles.providerGrid}>
        <article className={styles.providerCard}>
          <div className={styles.providerHead}><span>SHOPIFY</span><strong>{shopifyChannels.length ? '已登记' : '未配置'}</strong></div>
          <h2>Shopify</h2>
          <p>当前首个实际 Commerce Provider。Webhook 写入、规范化订单/履约事实与重放基础已经存在。</p>
          <div className={styles.providerMeta}>{shopifyChannels.length} 个渠道 · Webhook adapter 已实现</div>
        </article>
        <article className={styles.providerCard}>
          <div className={styles.providerHead}><span>AMAZON</span><strong className={styles.pending}>{amazonChannels.length ? '渠道已登记 · SP-API 待配置' : '未配置 · SP-API 待接入'}</strong></div>
          <h2>Amazon Marketplace</h2>
          <p>本阶段只建立正式渠道身份、映射和管理入口。不会伪造 Seller Central/SP-API 已连接，也不会在页面保存 token 或密钥。</p>
          <div className={styles.providerMeta}>{amazonChannels.length} 个渠道 · Orders / FBA-FBM / Settlement 后续适配</div>
        </article>
      </section>

      <div className={styles.metrics}>
        <div><span>渠道</span><b>{metrics.channels}</b></div>
        <div><span>规范化订单</span><b>{metrics.orders}</b></div>
        <div><span>待处理异常</span><b>{metrics.open}</b></div>
        <div><span>未映射明细</span><b>{metrics.unmapped}</b></div>
      </div>

      <section className={styles.topGrid}>
        <form className={styles.card} onSubmit={createChannel}>
          <span>渠道登记</span><h2>登记外部电商渠道</h2>
          <select name="provider" required defaultValue="SHOPIFY">
            <option value="SHOPIFY">Shopify</option><option value="AMAZON">Amazon Marketplace</option><option value="OTHER">其他渠道</option>
          </select>
          <div className={styles.inline}><input name="channelKey" placeholder="amazon-de / shopify-eu" required/><input name="displayName" placeholder="ALSVID Amazon Germany" required/></div>
          <input name="externalAccountId" placeholder="Seller ID / store.myshopify.com" required/>
          <input name="marketplace" placeholder="Amazon Marketplace（可选，如 DE）"/>
          <select name="defaultDealerPartnerId" defaultValue=""><option value="">不设置默认经销商</option>{dealerPartners.map((item) => <option key={item.id} value={item.id}>{item.partnerCode} · {item.displayName}</option>)}</select>
          <label className={styles.check}><input type="checkbox" name="requiresDealer"/> 此渠道要求经销商映射</label>
          <button>登记渠道</button>
        </form>
        <div className={styles.rule}>
          <span>职责边界</span><h2>ALSVID 不变成第二套 OMS</h2>
          <p>Shopify/Amazon 负责各自的店铺、下单、支付与平台履约。ALSVID 负责产品主数据、外部订单事实映射、异常与跨系统关联。Amazon ASIN、Seller SKU 或订单号都只是外部引用，不能自动生成 ALSVID SKU。</p>
        </div>
      </section>

      <section className={styles.channelList}>
        <div className={styles.sectionHead}><span>已登记渠道</span><h2>Provider 与账号引用</h2></div>
        {commerce.channels.map((channel) => <article key={channel.id}>
          <div><b>{channel.display_name}</b><small>{providerLabel(channel.provider)} · {channel.channel_key}</small></div>
          <div><span>{channel.external_account_id}</span><small>{channel.enabled ? '启用' : '停用'}{channel.provider === 'AMAZON' ? ' · SP-API 待配置' : ''}</small></div>
        </article>)}
        {!commerce.channels.length ? <p className={styles.empty}>尚未登记任何电商渠道。</p> : null}
      </section>

      <section className={styles.topGrid}>
        <form className={styles.card} onSubmit={mapVariant}>
          <span>SKU 映射</span><h2>外部商品 → ALSVID SKU</h2>
          <select name="channelId" required defaultValue=""><option value="" disabled>选择渠道</option>{commerce.channels.map((item) => <option key={item.id} value={item.id}>{providerLabel(item.provider)} · {item.channel_key}</option>)}</select>
          <input name="externalProductId" placeholder="商品 ID：Shopify Product ID / Amazon ASIN"/>
          <div className={styles.inline}><input name="externalVariantId" placeholder="映射键：Shopify Variant ID / Amazon Seller SKU" required/><input name="externalSku" placeholder="外部 SKU（可选）"/></div>
          <select name="skuId" required defaultValue=""><option value="" disabled>选择 ALSVID SKU</option>{skus.map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}</select>
          <button>保存映射</button>
        </form>
        <form className={styles.card} onSubmit={ingestShopify}>
          <span>SHOPIFY ADAPTER 测试 / 重放基础</span><h2>写入保留的 Shopify Delivery</h2>
          <select name="channelId" required defaultValue="" onChange={(event) => { const channel = commerce.channels.find((item) => item.id === event.target.value); const form = event.currentTarget.form; if (form && channel) { const field = form.elements.namedItem('shopDomain') as HTMLInputElement | null; if (field) field.value = channel.external_account_id; } }}>
            <option value="" disabled>选择 Shopify 渠道</option>{shopifyChannels.map((item) => <option key={item.id} value={item.id}>{item.channel_key}</option>)}
          </select>
          <div className={styles.inline}><input name="webhookId" placeholder="X-Shopify-Webhook-Id" required/><input name="eventId" placeholder="X-Shopify-Event-Id"/></div>
          <div className={styles.inline}><select name="topic"><option>orders/create</option><option>orders/updated</option><option>orders/cancelled</option><option>fulfillments/create</option><option>fulfillments/update</option><option>fulfillments/cancel</option></select><input name="apiVersion" defaultValue="2026-10"/></div>
          <input name="shopDomain" placeholder="store.myshopify.com" required/>
          <textarea name="payload" rows={5} defaultValue={'{"id":"1001","name":"#1001","currency":"EUR","subtotal_price":"0","total_price":"0","line_items":[]}'}/>
          <button>写入 Delivery Evidence</button>
          <small className={styles.formHint}>Amazon 此处不会出现测试入口；必须等正式 SP-API adapter 后再开放。</small>
        </form>
      </section>

      <section className={styles.orderGrid}>
        <div className={styles.orderList}>
          {commerce.orders.map((item) => {
            const channel = channelFor(item.channel_id);
            return <button key={item.id} className={selectedOrder?.id === item.id ? styles.selected : ''} onClick={() => setSelectedOrderId(item.id)}>
              <span>{providerLabel(channel?.provider ?? 'OTHER')} · {item.channel_key} · {statusLabel(item.order_status)}</span>
              <b>{item.external_order_name ?? item.external_order_id}</b>
              <small>{item.total_amount} {item.currency} · {statusLabel(item.fulfillment_status)}</small>
            </button>;
          })}
          {!commerce.orders.length ? <p className={styles.empty}>还没有同步进来的规范化订单。</p> : null}
        </div>
        {selectedOrder ? <div className={styles.detail}>
          <div className={styles.sectionHead}><span>外部订单事实</span><h2>{selectedOrder.external_order_name ?? selectedOrder.external_order_id}</h2><p>{selectedOrder.channel_name} · 来源更新时间 {selectedOrder.source_updated_at ? new Date(selectedOrder.source_updated_at).toLocaleString() : '—'}</p></div>
          <div className={styles.factGrid}>
            <div><span>订单</span><b>{statusLabel(selectedOrder.order_status)}</b></div><div><span>财务状态</span><b>{statusLabel(selectedOrder.financial_status)}</b></div><div><span>履约状态</span><b>{statusLabel(selectedOrder.fulfillment_status)}</b></div><div><span>经销商</span><b>{selectedOrder.dealer_name ?? '未映射'}</b></div><div><span>客户</span><b>{selectedOrder.customer_name ?? '未映射'}</b></div><div><span>金额</span><b>{selectedOrder.total_amount} {selectedOrder.currency}</b></div>
          </div>
          <form className={styles.partnerMap} onSubmit={mapPartners}>
            <select name="dealerPartnerId" defaultValue={selectedOrder.dealer_partner_id ?? ''}><option value="">不映射经销商</option>{dealerPartners.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
            <select name="customerPartnerId" defaultValue={selectedOrder.customer_partner_id ?? ''}><option value="">不映射客户</option>{customerPartners.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
            <button>保存 Partner 映射</button>
          </form>
          <div className={styles.lines}><span>订单明细</span>{orderLines.map((line) => <article key={line.id}><div><b>{line.title || line.external_line_id}</b><small>商品 {line.external_product_id ?? '—'} · 映射键 {line.external_variant_id ?? '—'} · {line.external_sku ?? '无外部 SKU'}</small></div><div><b>{line.quantity} × {line.unit_price} {line.currency}</b><small>{line.mapped_sku ? `${line.mapped_sku} · ${statusLabel(line.mapping_source)}` : '未映射'}</small></div></article>)}</div>
          <div className={styles.lines}><span>履约事实</span>{orderFulfillments.map((fulfillment) => <article key={fulfillment.id}><div><b>{fulfillment.external_fulfillment_id} · {statusLabel(fulfillment.fulfillment_status)}</b><small>{fulfillment.tracking_company ?? ''} {fulfillment.tracking_number ?? ''}</small></div><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void action(`/v1/commerce/fulfillments/${fulfillment.id}/shipment`, { shipmentId: data.get('shipmentId') || null }); }}><select name="shipmentId" defaultValue={fulfillment.logistics_shipment_id ?? ''}><option value="">不关联 ALSVID Shipment</option>{shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.shipment_number} · {shipment.status}</option>)}</select><button>映射</button></form></article>)}</div>
        </div> : <div className={styles.detail}><p className={styles.empty}>选择一个订单查看详情。</p></div>}
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.sectionHead}><span>对账异常</span><h2>异常保留，不静默丢弃</h2></div>
          {openExceptions.map((item) => <article className={styles.exception} key={item.id}><div><b>{item.exception_type}</b><span>{item.channel_key} · {item.entity_type}</span><p>{item.message}</p></div><div className={styles.actions}><button onClick={() => void action(`/v1/commerce/exceptions/${item.id}/resolve`, { action: 'RESOLVED', resolution: { note: 'Reviewed in Commerce workspace' } })}>标记已解决</button><button className={styles.secondary} onClick={() => void action(`/v1/commerce/exceptions/${item.id}/resolve`, { action: 'IGNORED', resolution: { note: 'Explicitly ignored' } })}>忽略</button></div></article>)}
          {!openExceptions.length ? <p className={styles.empty}>当前没有待处理映射异常。</p> : null}
        </div>
        <div className={styles.panel}>
          <div className={styles.sectionHead}><span>集成证据</span><h2>Delivery receipts & attempts</h2><p>当前证据流仍来自 Shopify Webhook；Amazon SP-API adapter 尚未接入。</p></div>
          {integrations.receipts.slice(0, 30).map((receipt) => { const attempt = latestAttempt(receipt.id); const channel = channelFor(receipt.channel_id); return <article className={styles.receipt} key={receipt.id}><div><b>{providerLabel(channel?.provider ?? 'OTHER')} · {receipt.topic}</b><span>{receipt.channel_key} · {receipt.provider_event_id}</span><small>{attempt ? `${statusLabel(attempt.outcome)} · 第 ${attempt.attempt_number} 次` : '尚无处理尝试'}</small></div>{channel?.provider === 'SHOPIFY' ? <button onClick={() => void action(`/v1/integrations/shopify/receipts/${receipt.id}/replay`)}>重放</button> : null}</article>; })}
          {!integrations.receipts.length ? <p className={styles.empty}>还没有保留的集成证据。</p> : null}
        </div>
      </section>
    </AppShell>
  );
}
