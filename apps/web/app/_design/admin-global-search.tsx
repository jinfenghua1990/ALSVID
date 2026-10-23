'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  searchAuthorizedBusinessRecords,
  type AdminSearchCatalog,
  type AdminSearchOrder,
  type AdminSearchPartner,
  type AdminSearchProductionOrder,
  type AdminSearchVehicle,
  type AdminSearchInventoryBalance,
  type AdminSearchPurchaseOrder,
  type AdminSearchQuotation,
  type AdminSearchServiceCase,
  type AdminSearchFinanceDocument,
  type AdminSearchFinanceObligation,
  type AdminSearchSources,
  type AdminBusinessSearchResult,
} from './admin-business-search';
import styles from './admin-global-search.module.css';

async function readAuthorized<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(
    response.status === 401 ? '登录已过期' :
    response.status === 403 ? '当前账号无权读取' : '业务数据暂时不可读取');
  const payload = await response.json().catch(() => null) as { data?: T } | null;
  if (!payload || !('data' in payload)) throw new Error('业务数据格式异常');
  return payload.data as T;
}

const sourceCount = 9;
const typeLabels: Record<AdminBusinessSearchResult['type'], string> = {
  model: '型号',
  sku: 'SKU',
  order: '订单',
  partner: '合作伙伴',
  production: '生产单',
  vehicle: 'VIN',
  inventory: '库存',
  'purchase-order': '采购单',
  quotation: '询价单',
  'service-case': '售后工单',
  'finance-document': '财务单据',
  obligation: '应收应付',
};

/** Accessible, read-only search across authorized domain APIs; no write requests are made. */
export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<AdminBusinessSearchResult[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim().slice(0, 100);
    if (keyword.length < 2) return;
    setBusy(true);
    setSearched(false);
    setResults([]);
    setUnavailable([]);
    try {
      const [products, commerce, partners, production, vehicles, inventory, procurement, serviceCases, finance] =
        await Promise.allSettled([
          readAuthorized<AdminSearchCatalog>('/api/control/v1/product/catalog'),
          readAuthorized<{ orders: AdminSearchOrder[] }>('/api/control/v1/commerce/storefront/summary'),
          readAuthorized<AdminSearchPartner[]>('/api/control/v1/partners'),
          readAuthorized<{ orders: AdminSearchProductionOrder[] }>('/api/control/v1/production'),
          readAuthorized<AdminSearchVehicle[]>('/api/control/v1/vehicles'),
          readAuthorized<{ balances: AdminSearchInventoryBalance[] }>('/api/control/v1/inventory'),
          readAuthorized<{ purchaseOrders: AdminSearchPurchaseOrder[]; quotations: AdminSearchQuotation[] }>('/api/control/v1/procurement'),
          readAuthorized<AdminSearchServiceCase[]>('/api/control/v1/service/cases'),
          readAuthorized<{ documents: AdminSearchFinanceDocument[]; obligations: AdminSearchFinanceObligation[] }>('/api/control/v1/finance'),
        ]);

      const errors: string[] = [];
      const sources: AdminSearchSources = {};
      let catalog: AdminSearchCatalog | null = null;
      let orders: AdminSearchOrder[] | null = null;

      if (products.status === 'fulfilled' && Array.isArray(products.value.models) && Array.isArray(products.value.skus)) {
        catalog = products.value;
      } else errors.push('产品主数据');

      if (commerce.status === 'fulfilled' && Array.isArray(commerce.value.orders)) {
        orders = commerce.value.orders;
      } else errors.push('B2C 订单');

      if (partners.status === 'fulfilled' && Array.isArray(partners.value)) {
        sources.partners = partners.value;
      } else errors.push('合作伙伴');

      if (production.status === 'fulfilled' && Array.isArray(production.value.orders)) {
        sources.production = production.value.orders;
      } else errors.push('生产工单');

      if (vehicles.status === 'fulfilled' && Array.isArray(vehicles.value)) {
        sources.vehicles = vehicles.value;
      } else errors.push('车辆 VIN');

      if (inventory.status === 'fulfilled' && Array.isArray(inventory.value.balances)) {
        sources.inventory = inventory.value.balances;
      } else errors.push('库存台账');

      if (procurement.status === 'fulfilled' && Array.isArray(procurement.value.purchaseOrders) &&
          Array.isArray(procurement.value.quotations)) {
        sources.procurement = procurement.value;
      } else errors.push('采购单');

      if (serviceCases.status === 'fulfilled' && Array.isArray(serviceCases.value)) {
        sources.serviceCases = serviceCases.value;
      } else errors.push('售后工单');

      if (finance.status === 'fulfilled' && Array.isArray(finance.value.documents) &&
          Array.isArray(finance.value.obligations)) {
        sources.finance = finance.value;
      } else errors.push('财务单据');

      setUnavailable(errors);
      setResults(searchAuthorizedBusinessRecords(catalog, orders, keyword, sources));
      setSearched(true);
    } catch {
      setUnavailable(['搜索处理失败']);
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.root}>
    <button ref={triggerRef} className="av-iconbtn" type="button"
      aria-label="搜索全部可访问的业务记录" aria-expanded={open} aria-controls="admin-business-search-popover"
      onClick={() => setOpen(current => !current)}>⌕</button>
    {open ? <div id="admin-business-search-popover" className={styles.popup} role="dialog" aria-label="全局业务搜索"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}>
      <div className={styles.heading}>
        <div><strong>全局业务搜索</strong><small>产品、订单、经销商、生产、库存、采购、VIN、售后与财务</small></div>
        <button type="button" className={styles.close}
          onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="关闭搜索">×</button>
      </div>
      <form className={styles.form} onSubmit={event => { void search(event); }}>
        <input ref={searchRef} value={query}
          onChange={event => { setQuery(event.target.value.slice(0, 100)); setSearched(false); }}
          type="search" aria-label="搜索型号、SKU、订单号、VIN、采购单或工单"
          placeholder="型号 / SKU / 订单号 / VIN / 采购单 / 工单" minLength={2} maxLength={100} />
        <button disabled={busy || query.trim().length < 2} type="submit">{busy ? '搜索中…' : '查询'}</button>
      </form>
      {unavailable.length ? <p className={styles.warning} role="status">
        暂不可读取：{unavailable.join('、')}。未能读取的来源不按零条结果计算。
      </p> : null}
      {searched ? <div className={styles.results} role="status" aria-live="polite">
        <p className={styles.note}>
          {unavailable.length === sourceCount ? '无法确认搜索结果' :
            '在已成功读取的来源中找到 ' + results.length + ' 条，单类最多显示 8 条'}
        </p>
        {results.map(item => <a key={item.key} className={styles.result} href={item.href}>
          <span className={styles.type}>{typeLabels[item.type]}</span>
          <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
          <span aria-hidden="true">→</span>
        </a>)}
        {!results.length && unavailable.length < sourceCount ?
          <p className={styles.note}>已成功读取的来源中没有匹配记录。</p> : null}
      </div> : <p className={styles.note}>只搜索当前账号有权限读取的真实业务记录，不搜索示例数据或未连接的外部渠道。</p>}
    </div> : null}
  </div>;
}
