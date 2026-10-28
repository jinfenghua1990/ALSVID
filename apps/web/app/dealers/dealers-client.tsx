'use client';

import { OperationsFrame } from '../_components/operations-frame';


import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dealers.module.css';

type Partner = { id: string; partnerCode: string; displayName: string; countryCode: string | null; roles: string[] };
type Dealer = {
  id: string;
  partner_id: string;
  partner_code: string;
  display_name: string;
  country_code: string | null;
  status: 'PROSPECT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  market_countries: string[];
  sales_enabled: boolean;
  service_enabled: boolean;
  note: string;
  version: number;
  default_shipping_line1: string | null;
  default_shipping_city: string | null;
  default_shipping_country: string | null;
  default_contact_type: string | null;
  default_contact_value: string | null;
  default_inventory_location_code: string | null;
  default_inventory_warehouse_code: string | null;
};
type History = { id: string; dealer_id: string; display_name: string; from_status: string; to_status: string; reason: string; occurred_at: string };
type DealerSummary = { dealers: Dealer[]; history: History[] };

const empty: DealerSummary = { dealers: [], history: [] };
type LoadState = 'loading' | 'ready' | 'error';

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PROSPECT: '潜在合作',
    ACTIVE: '合作中',
    SUSPENDED: '已暂停',
    CLOSED: '已关闭',
  };
  return labels[status] ?? status;
}

export default function DealersClient({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [summary, setSummary] = useState<DealerSummary>(empty);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [dealerLoad, setDealerLoad] = useState<LoadState>('loading');
  const [partnerLoad, setPartnerLoad] = useState<LoadState>('loading');
  const [dealerError, setDealerError] = useState('');
  const [partnerError, setPartnerError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) {
      router.push('/login?portal=admin');
      throw new Error('登录状态已过期，请重新登录');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function reload() {
    setDealerLoad('loading');
    setPartnerLoad('loading');
    setDealerError('');
    setPartnerError('');
    // Partners and dealers are independent reads: a Partner API error must not
    // make an otherwise healthy Dealer list falsely appear empty.
    const [dealerResult, partnerResult] = await Promise.allSettled([
      api('/v1/dealers'),
      api('/v1/partners'),
    ]);
    if (dealerResult.status === 'fulfilled' && Array.isArray(dealerResult.value?.dealers)) {
      const data = dealerResult.value as DealerSummary;
      setSummary({ dealers: data.dealers, history: Array.isArray(data.history) ? data.history : [] });
      setSelectedId(previous => data.dealers.some(row => row.id === previous) ? previous : (data.dealers[0]?.id ?? ''));
      setDealerLoad('ready');
    } else {
      setDealerError(dealerResult.status === 'rejected' && dealerResult.reason instanceof Error
        ? dealerResult.reason.message : '经销商数据暂时无法读取，请重试。');
      setDealerLoad('error');
    }
    if (partnerResult.status === 'fulfilled' && Array.isArray(partnerResult.value)) {
      setPartners(partnerResult.value as Partner[]);
      setPartnerLoad('ready');
    } else {
      setPartnerError(partnerResult.status === 'rejected' && partnerResult.reason instanceof Error
        ? partnerResult.reason.message : '合作伙伴数据暂时无法读取。');
      setPartnerLoad('error');
    }
  }

  useEffect(() => { void reload(); }, []);

  const dealerPartners = partners.filter(item => item.roles.includes('DEALER'));
  const eligiblePartners = dealerPartners.filter(item => !summary.dealers.some(dealer => dealer.partner_id === item.id));
  const query = search.trim().toLocaleLowerCase();
  const filtered = dealerLoad === 'ready' ? summary.dealers.filter(item => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const haystack = [item.display_name, item.partner_code, item.country_code ?? '',
      ...(item.market_countries ?? [])].join(' ').toLocaleLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  }) : [];
  const selected = filtered.find(item => item.id === selectedId) ?? filtered[0] ?? null;
  const history = useMemo(() => selected ? summary.history.filter((item) => item.dealer_id === selected.id) : [], [summary.history, selected]);
  const metrics = useMemo(() => ({
    total: summary.dealers.length,
    active: summary.dealers.filter((item) => item.status === 'ACTIVE').length,
    service: summary.dealers.filter((item) => item.service_enabled).length,
    countries: new Set(summary.dealers.flatMap((item) => item.market_countries)).size,
  }), [summary.dealers]);
  const capabilityLabel = selected
    ? [selected.sales_enabled ? '销售' : null, selected.service_enabled ? '售后服务' : null].filter(Boolean).join(' + ') || '—'
    : '—';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    try {
      await api('/v1/dealers', {
        method: 'POST',
        body: JSON.stringify({
          partnerId: form.get('partnerId'),
          marketCountries: String(form.get('markets') ?? '').split(',').map((value) => value.trim()).filter(Boolean),
          salesEnabled: form.get('salesEnabled') === 'on',
          serviceEnabled: form.get('serviceEnabled') === 'on',
          note: form.get('note'),
        }),
      });
      target.reset();
      setMessage('经销商运营档案已创建。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法创建经销商档案');
    }
  }

  async function status(next: 'ACTIVE' | 'SUSPENDED' | 'CLOSED') {
    if (!selected) return;
    const input = window.prompt(`请输入“${statusLabel(next)}”的原因`, '');
    if (input === null) return; // Cancelling the prompt must not mutate a dealer.
    const reason = input.trim();
    if (!reason) {
      setMessage('请填写合作状态变更原因。');
      return;
    }
    try {
      await api(`/v1/dealers/${selected.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ expectedVersion: selected.version, status: next, reason }),
      });
      setMessage(`经销商状态已更新为：${statusLabel(next)}。`);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法更新经销商状态');
    }
  }

  async function toggle(field: 'salesEnabled' | 'serviceEnabled') {
    if (!selected) return;
    const body = {
      expectedVersion: selected.version,
      [field]: field === 'salesEnabled' ? !selected.sales_enabled : !selected.service_enabled,
    };
    try {
      await api(`/v1/dealers/${selected.id}/update`, { method: 'POST', body: JSON.stringify(body) });
      setMessage('经销商业务能力已更新。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法更新经销商业务能力');
    }
  }

  return (
    <OperationsFrame embedded={embedded} area="dealers" footer="ALSVID · 内部管理">
      <section>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.eyebrow}>渠道运营 / DEALER NETWORK</div>
            <h1>经销商管理</h1>
            <p>管理经销商合作状态、销售市场和服务能力。企业主体、地址和联系人由合作伙伴主数据统一维护。</p>
          </div>
          <div className={styles.headerActions}>
            <a className={styles.headerLink} href="/admin/dealers/applications">合作申请</a>
            <a className={styles.headerLink} href="/admin/dealers/test-rides">试骑与合作网点</a>
            <button type="button" className={styles.primaryAction}
              aria-expanded={showCreate} onClick={() => setShowCreate(value => !value)}>
              {showCreate ? '收起建档' : '＋ 新建经销商'}
            </button>
          </div>
        </header>
        {message ? <div className={styles.notice} role="status">{message}</div> : null}
        {dealerLoad === 'error' ? <div className={styles.error} role="alert">
          {dealerError} <button type="button" onClick={() => { void reload(); }}>重新加载</button>
        </div> : null}

        <div className={styles.metrics}>
          <div><span>经销商总数</span><b>{dealerLoad === 'ready' ? metrics.total : '—'}</b></div>
          <div><span>合作中</span><b>{dealerLoad === 'ready' ? metrics.active : '—'}</b></div>
          <div><span>可提供售后服务</span><b>{dealerLoad === 'ready' ? metrics.service : '—'}</b></div>
          <div><span>覆盖市场</span><b>{dealerLoad === 'ready' ? metrics.countries : '—'}</b></div>
        </div>

        <section className={styles.grid} aria-label="经销商运营档案">
          <div className={styles.listColumn}>
            <div className={styles.listToolbar}>
              <div className={styles.listHeading}><strong>经销商列表</strong><small>{dealerLoad === 'ready' ? `${filtered.length} / ${summary.dealers.length} 家` : '读取中'}</small></div>
              <label htmlFor="dealer-search">搜索经销商</label>
              <input id="dealer-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
                placeholder="公司名称、编码、国家" />
              <label htmlFor="dealer-status-filter">合作状态</label>
              <select id="dealer-status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="ALL">全部状态</option>
                <option value="PROSPECT">潜在合作</option>
                <option value="ACTIVE">合作中</option>
                <option value="SUSPENDED">已暂停</option>
                <option value="CLOSED">已关闭</option>
              </select>
            </div>
            <div className={styles.list}>
            {filtered.map((item) => (
              <button key={item.id} className={selected?.id === item.id ? styles.selected : ''} onClick={() => setSelectedId(item.id)}>
                <span>{statusLabel(item.status)}</span>
                <b>{item.display_name}</b>
                <small>{item.partner_code} · {(item.market_countries ?? []).join(' · ') || '尚未设置市场'}</small>
              </button>
            ))}
            {dealerLoad === 'loading' ? <p className={styles.empty} role="status">正在读取经销商数据…</p> : null}
            {dealerLoad === 'ready' && summary.dealers.length === 0
              ? <p className={styles.empty}>当前还没有经销商运营档案。可通过「新建经销商」关联已登记的合作伙伴。</p> : null}
            {dealerLoad === 'ready' && summary.dealers.length > 0 && filtered.length === 0
              ? <p className={styles.empty}>没有符合筛选条件的经销商。</p> : null}
          </div>
          </div>

          {selected ? (
            <div className={styles.detail}>
              <div className={styles.sectionHead}>
                <span>经销商 360 基础档案</span>
                <h2>{selected.display_name}</h2>
                <p>{selected.partner_code} · {selected.country_code ?? '—'} · v{selected.version}</p>
              </div>
              <div className={styles.factGrid}>
                <div><span>状态</span><b>{statusLabel(selected.status)}</b></div>
                <div><span>市场</span><b>{selected.market_countries.join(', ') || '—'}</b></div>
                <div><span>业务能力</span><b>{capabilityLabel}</b></div>
                <div><span>默认联系人</span><b>{selected.default_contact_value ?? '—'}</b></div>
                <div><span>默认收货城市</span><b>{selected.default_shipping_city ?? '—'}</b></div>
                <div><span>默认库存位置</span><b>{selected.default_inventory_warehouse_code ? `${selected.default_inventory_warehouse_code}/${selected.default_inventory_location_code}` : '—'}</b></div>
              </div>
              <div className={styles.actions}>
                {selected.status === 'PROSPECT' ? <button onClick={() => void status('ACTIVE')}>启用合作</button> : null}
                {selected.status === 'ACTIVE' ? <button onClick={() => void status('SUSPENDED')}>暂停合作</button> : null}
                {selected.status === 'SUSPENDED' ? <button onClick={() => void status('ACTIVE')}>恢复合作</button> : null}
                {selected.status !== 'CLOSED' ? <button className={styles.secondary} onClick={() => void status('CLOSED')}>关闭合作</button> : null}
                <button className={styles.secondary} onClick={() => void toggle('salesEnabled')}>{selected.sales_enabled ? '停用销售能力' : '启用销售能力'}</button>
                <button className={styles.secondary} onClick={() => void toggle('serviceEnabled')}>{selected.service_enabled ? '停用售后能力' : '启用售后能力'}</button>
              </div>
              <div className={styles.timeline}>
                <span>状态历史</span>
                {history.map((item) => (
                  <article key={item.id}>
                    <time>{new Date(item.occurred_at).toLocaleString()}</time>
                    <b>{statusLabel(item.from_status)} → {statusLabel(item.to_status)}</b>
                    <p>{item.reason || '未记录原因'}</p>
                  </article>
                ))}
                {!history.length ? <p className={styles.empty}>暂无状态变更记录。</p> : null}
              </div>
            </div>
          ) : (
            <div className={styles.detail}><p className={styles.empty}>请选择一个经销商。</p></div>
          )}
        </section>
        {showCreate ? <section className={styles.createGrid} id="new-dealer" aria-label="创建经销商">
          <form className={styles.card} onSubmit={submit} aria-label="新建经销商档案">
            <span>新建经销商档案</span>
            <h2>将合作伙伴加入经销商运营层</h2>
            <label htmlFor="dealer-partner">已存在的合作伙伴（必填）</label>
            <select id="dealer-partner" name="partnerId" required defaultValue="" disabled={partnerLoad !== 'ready' || eligiblePartners.length === 0}>
              <option value="" disabled>选择具备 DEALER 角色的合作伙伴</option>
              {eligiblePartners.map((item) => (
                <option key={item.id} value={item.id}>{item.partnerCode} · {item.displayName}</option>
              ))}
            </select>
            <label htmlFor="dealer-markets">授权销售国家代码（用逗号分隔）</label>
            <input id="dealer-markets" name="markets" placeholder="例如：DE, AT" />
            <div className={styles.checks}>
              <label><input type="checkbox" name="salesEnabled" defaultChecked /> 销售</label>
              <label><input type="checkbox" name="serviceEnabled" /> 售后服务</label>
            </div>
            <label htmlFor="dealer-note">合作备注</label>
            <input id="dealer-note" name="note" placeholder="商业 / 运营备注" />
            {partnerLoad === 'error' ? <p className={styles.formHelp} role="alert">{partnerError}</p> : null}
            {partnerLoad === 'ready' && eligiblePartners.length === 0
              ? <p className={styles.formHelp}>没有可选的合作伙伴。请先在合作伙伴管理建立具备 DEALER 角色的主体。</p> : null}
            <button type="submit" disabled={dealerLoad !== 'ready' || partnerLoad !== 'ready' || eligiblePartners.length === 0}>创建经销商档案</button>
          </form>
          <div className={styles.rule}>
            <span>数据边界</span>
            <h2>不重复维护经销商主数据</h2>
            <p>名称、法律主体、VAT/EORI、地址与联系人仍由 Partner 主数据负责。Dealer 只保存 ALSVID 运营经销商网络所需的业务关系事实。</p>
          </div>
        </section> : null}

      </section>
    </OperationsFrame>
  );
}
