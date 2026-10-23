'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './integrations-admin-client.module.css';

type ProviderConnection = {
  id: string;
  provider_code: string;
  display_name: string;
  account_ref: string;
  connection_status: 'NOT_CONFIGURED' | 'PENDING_REVIEW' | 'CONNECTED' | 'ERROR' | 'PAUSED';
  capabilities: string[];
  credentials_configured: boolean;
  last_probe_at: string | null;
  last_success_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};
type WarehouseOption = { id: string; code: string; name: string; country_code: string; timezone: string };
type SkuOption = { id: string; sku: string; name: string };
type Mapping = { id: string; provider_code: string; provider_name: string; mapping_status: string; [key: string]: unknown };
type SyncRun = { id: string; provider_code: string; provider_name: string; sync_type: string; status: string; records_seen: number; records_accepted: number; records_rejected: number; retryable: boolean; error_code: string | null; created_at: string; completed_at: string | null };
type Summary = { connections: ProviderConnection[]; warehouseMappings: Mapping[]; skuMappings: Mapping[]; syncRuns: SyncRun[]; warehouseOptions: WarehouseOption[]; skuOptions: SkuOption[] };
type FormState = { providerCode: string; displayName: string; accountRef: string; credentialsSecretRef: string };
const empty: Summary = { connections: [], warehouseMappings: [], skuMappings: [], syncRuns: [], warehouseOptions: [], skuOptions: [] };
const statusLabel: Record<ProviderConnection['connection_status'], string> = {
  NOT_CONFIGURED: '未配置',
  PENDING_REVIEW: '待验证',
  CONNECTED: '已连接',
  ERROR: '连接异常',
  PAUSED: '已暂停',
};
const mappingStatusLabel: Record<string, string> = { PENDING: '待验证', VERIFIED: '已验证', REJECTED: '已拒绝', INACTIVE: '已停用' };
const syncStatusLabel: Record<string, string> = { QUEUED: '排队中', RUNNING: '执行中', SUCCEEDED: '成功', PARTIAL: '部分成功', FAILED: '失败', CANCELLED: '已取消' };
const syncTypeLabel: Record<string, string> = { WAREHOUSE_LIST: '仓库列表', SKU_MAPPING_VALIDATION: 'SKU 映射校验', INVENTORY_SNAPSHOT: '库存快照', FULFILLMENT_STATUS: '履约状态', SHIPMENT_TRACKING: '物流跟踪', RECONCILIATION: '库存对账' };

function time(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false });
}
function value(row: Mapping, key: string) {
  const result = row[key];
  return typeof result === 'string' || typeof result === 'number' ? String(result) : '—';
}

export default function IntegrationsAdminClient() {
  const router = useRouter();
  const [data, setData] = useState<Summary>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState>({ providerCode: '', displayName: '', accountRef: '', credentialsSecretRef: '' });
  const [warehouseMappingForm, setWarehouseMappingForm] = useState({ connectionId: '', internalWarehouseId: '', externalWarehouseId: '', externalCode: '', externalName: '' });
  const [skuMappingForm, setSkuMappingForm] = useState({ connectionId: '', internalSkuId: '', externalSku: '', externalItemId: '' });

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch('/api/control' + path, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('登录状态已过期，请重新登录');
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message ?? (response.status === 403 ? '当前账号没有系统集成管理权限' : '请求失败'));
    return payload?.data;
  }

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const summary = await api('/v1/integrations/warehouse-providers') as Summary;
      setData({
        connections: Array.isArray(summary?.connections) ? summary.connections : [],
        warehouseMappings: Array.isArray(summary?.warehouseMappings) ? summary.warehouseMappings : [],
        skuMappings: Array.isArray(summary?.skuMappings) ? summary.skuMappings : [],
        syncRuns: Array.isArray(summary?.syncRuns) ? summary.syncRuns : [],
        warehouseOptions: Array.isArray(summary?.warehouseOptions) ? summary.warehouseOptions : [],
        skuOptions: Array.isArray(summary?.skuOptions) ? summary.skuOptions : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '第三方仓配置读取失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await api('/v1/integrations/warehouse-providers', {
        method: 'POST',
        body: JSON.stringify({
          providerCode: form.providerCode.trim().toUpperCase(),
          displayName: form.displayName.trim(),
          accountRef: form.accountRef.trim(),
          ...(form.credentialsSecretRef.trim() ? { credentialsSecretRef: form.credentialsSecretRef.trim() } : {}),
        }),
      }) as ProviderConnection;
      setForm({ providerCode: '', displayName: '', accountRef: '', credentialsSecretRef: '' });
      setNotice(created.connection_status === 'PENDING_REVIEW'
        ? '配置记录已保存，状态为“待验证”。系统尚未测试连接，不代表仓商已接通。'
        : '基础信息已保存，状态为“未配置”。补齐 Secret Manager 引用并完成服务端验证后，才可接入。');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function submitWarehouseMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(`/v1/integrations/warehouse-providers/${encodeURIComponent(warehouseMappingForm.connectionId)}/warehouse-mappings`, {
        method: 'POST',
        body: JSON.stringify({
          internalWarehouseId: warehouseMappingForm.internalWarehouseId,
          externalWarehouseId: warehouseMappingForm.externalWarehouseId.trim(),
          externalCode: warehouseMappingForm.externalCode.trim(),
          externalName: warehouseMappingForm.externalName.trim(),
        }),
      });
      setWarehouseMappingForm({ connectionId: '', internalWarehouseId: '', externalWarehouseId: '', externalCode: '', externalName: '' });
      setNotice('仓库映射已保存为“待验证”；系统尚未从仓商 API 验证该映射。');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : '仓库映射保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function submitSkuMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api(`/v1/integrations/warehouse-providers/${encodeURIComponent(skuMappingForm.connectionId)}/sku-mappings`, {
        method: 'POST',
        body: JSON.stringify({
          internalSkuId: skuMappingForm.internalSkuId,
          externalSku: skuMappingForm.externalSku.trim(),
          externalItemId: skuMappingForm.externalItemId.trim(),
        }),
      });
      setSkuMappingForm({ connectionId: '', internalSkuId: '', externalSku: '', externalItemId: '' });
      setNotice('SKU 映射已保存为“待验证”；未经仓商 API 验证的库存不会计入可售库存。');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SKU 映射保存失败');
    } finally {
      setSaving(false);
    }
  }

  return <div className={styles.root}>
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}>THIRD-PARTY WAREHOUSE / WMS</span><h2>第三方仓连接配置</h2><p>这里只登记服务商和 Secret Manager 引用，不接收密钥原文，也不会因为保存记录就显示已连接。</p></div>
        <button type="button" className={styles.secondaryButton} onClick={() => void reload()} disabled={loading || saving}>{loading ? '读取中…' : '刷新状态'}</button>
      </div>
      <div className={styles.stats}>
        <div><span>配置记录</span><strong>{loading ? '—' : data.connections.length}</strong></div>
        <div><span>已连接</span><strong>{loading ? '—' : data.connections.filter(item => item.connection_status === 'CONNECTED').length}</strong></div>
        <div><span>待验证</span><strong>{loading ? '—' : data.connections.filter(item => item.connection_status === 'PENDING_REVIEW').length}</strong></div>
        <div><span>映射待验证</span><strong>{loading ? '—' : data.warehouseMappings.filter(item => item.mapping_status === 'PENDING').length + data.skuMappings.filter(item => item.mapping_status === 'PENDING').length}</strong></div>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      <div className={styles.tableWrap}>
        <table><thead><tr><th>服务商</th><th>账号引用</th><th>连接状态</th><th>密钥引用</th><th>最近探测</th><th>最近成功同步</th></tr></thead>
          <tbody>
            {data.connections.map(item => <tr key={item.id}>
              <td><strong>{item.display_name}</strong><small>{item.provider_code}</small></td>
              <td>{item.account_ref}</td>
              <td><span className={item.connection_status === 'CONNECTED' ? styles.goodStatus : styles.status}>{statusLabel[item.connection_status]}</span></td>
              <td>{item.credentials_configured ? '已登记引用（不回显）' : '未配置'}</td>
              <td>{time(item.last_probe_at)}</td>
              <td>{time(item.last_success_at)}</td>
            </tr>)}
            {!loading && data.connections.length === 0 ? <tr><td colSpan={6} className={styles.empty}>暂无第三方仓配置。添加记录不会触发任何外部 API 调用。</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>

    <section className={styles.panel}>
      <div className={styles.heading}><div><span className={styles.eyebrow}>CONFIGURATION</span><h2>登记仓商账号</h2><p>需使用 Google Secret Manager 的资源路径；请勿粘贴 API Key、密码或 Token 原文。</p></div></div>
      <form className={styles.form} onSubmit={submit}>
        <label>服务商代码<input required minLength={2} maxLength={64} value={form.providerCode} onChange={e => setForm({ ...form, providerCode: e.target.value })} placeholder="例如：WAREHOUSE_EU" pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,63}" /></label>
        <label>服务商名称<input required minLength={2} maxLength={120} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="仓储服务商名称" /></label>
        <label>服务商账号引用<input required maxLength={255} value={form.accountRef} onChange={e => setForm({ ...form, accountRef: e.target.value })} placeholder="仓商提供的商户 ID / 账号编号" /></label>
        <label className={styles.wide}>Secret Manager 资源路径（可稍后补齐）
          <input value={form.credentialsSecretRef} onChange={e => setForm({ ...form, credentialsSecretRef: e.target.value })} placeholder="projects/项目ID/secrets/alsvid-wms-名称/versions/latest" autoComplete="off" />
        </label>
        <p className={styles.formNote}>保存后状态最多为“待验证”。当前尚未实现真实仓商适配器、Secret Manager 读取与连接探测，因此不会触发同步或订单履约。</p>
        <div className={styles.formActions}><button type="submit" disabled={saving || loading}>{saving ? '保存中…' : '保存配置记录'}</button></div>
      </form>
    </section>

    <section className={styles.panel}>
      <div className={styles.heading}><div><span className={styles.eyebrow}>MAPPING</span><h2>仓库与 SKU 映射</h2><p>外部编码必须映射到内部真实仓库 / SKU；没有映射或验证的外部库存不得计入可售库存。</p></div></div>
      <h3>新增仓库映射</h3>
      <form className={styles.mappingForm} onSubmit={submitWarehouseMapping}>
        <label>服务商账号<select required value={warehouseMappingForm.connectionId} onChange={e => setWarehouseMappingForm({ ...warehouseMappingForm, connectionId: e.target.value })}>
          <option value="">选择服务商</option>{data.connections.map(item => <option key={item.id} value={item.id}>{item.display_name} · {item.account_ref}</option>)}
        </select></label>
        <label>内部仓库<select required value={warehouseMappingForm.internalWarehouseId} onChange={e => setWarehouseMappingForm({ ...warehouseMappingForm, internalWarehouseId: e.target.value })}>
          <option value="">选择内部仓库</option>{data.warehouseOptions.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} ({item.country_code})</option>)}
        </select></label>
        <label>外部仓库 ID<input required maxLength={255} value={warehouseMappingForm.externalWarehouseId} onChange={e => setWarehouseMappingForm({ ...warehouseMappingForm, externalWarehouseId: e.target.value })} placeholder="仓商系统里的原始 ID" /></label>
        <label>外部仓库代码<input required maxLength={120} value={warehouseMappingForm.externalCode} onChange={e => setWarehouseMappingForm({ ...warehouseMappingForm, externalCode: e.target.value })} placeholder="仓商仓库代码" /></label>
        <label className={styles.wide}>外部仓库名称<input required maxLength={255} value={warehouseMappingForm.externalName} onChange={e => setWarehouseMappingForm({ ...warehouseMappingForm, externalName: e.target.value })} placeholder="仓商系统中的仓库名称" /></label>
        <div className={styles.formActions}><button type="submit" disabled={saving || loading || !data.connections.length || !data.warehouseOptions.length}>保存仓库映射</button></div>
      </form>
      <p className={styles.formNote}>新建映射初始状态为“待验证”；保存不会调用仓商 API，也不会自动改变库存。</p>
      <h3>仓库映射</h3>
      <div className={styles.tableWrap}><table><thead><tr><th>服务商</th><th>内部仓库</th><th>外部仓库 ID</th><th>外部名称</th><th>状态</th></tr></thead><tbody>
        {data.warehouseMappings.map(row => <tr key={row.id}><td>{value(row, 'provider_name')}</td><td>{value(row, 'internal_warehouse_code')} · {value(row, 'internal_warehouse_name')}</td><td>{value(row, 'external_warehouse_id')}</td><td>{value(row, 'external_name')}</td><td>{mappingStatusLabel[row.mapping_status] ?? row.mapping_status}</td></tr>)}
        {!loading && data.warehouseMappings.length === 0 ? <tr><td colSpan={5} className={styles.empty}>暂无仓库映射</td></tr> : null}
      </tbody></table></div>
      <h3>新增 SKU 映射</h3>
      <form className={styles.mappingForm} onSubmit={submitSkuMapping}>
        <label>服务商账号<select required value={skuMappingForm.connectionId} onChange={e => setSkuMappingForm({ ...skuMappingForm, connectionId: e.target.value })}>
          <option value="">选择服务商</option>{data.connections.map(item => <option key={item.id} value={item.id}>{item.display_name} · {item.account_ref}</option>)}
        </select></label>
        <label>内部 SKU<select required value={skuMappingForm.internalSkuId} onChange={e => setSkuMappingForm({ ...skuMappingForm, internalSkuId: e.target.value })}>
          <option value="">选择内部 SKU</option>{data.skuOptions.map(item => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}
        </select></label>
        <label>外部 SKU<input required maxLength={255} value={skuMappingForm.externalSku} onChange={e => setSkuMappingForm({ ...skuMappingForm, externalSku: e.target.value })} placeholder="仓商使用的 SKU 编码" /></label>
        <label>外部商品 ID<input required maxLength={255} value={skuMappingForm.externalItemId} onChange={e => setSkuMappingForm({ ...skuMappingForm, externalItemId: e.target.value })} placeholder="仓商系统里的商品 ID" /></label>
        <div className={styles.formActions}><button type="submit" disabled={saving || loading || !data.connections.length || !data.skuOptions.length}>保存 SKU 映射</button></div>
      </form>
      <h3>SKU 映射</h3>
      <div className={styles.tableWrap}><table><thead><tr><th>服务商</th><th>内部 SKU</th><th>外部 SKU</th><th>外部商品 ID</th><th>状态</th></tr></thead><tbody>
        {data.skuMappings.map(row => <tr key={row.id}><td>{value(row, 'provider_name')}</td><td>{value(row, 'internal_sku')}</td><td>{value(row, 'external_sku')}</td><td>{value(row, 'external_item_id')}</td><td>{mappingStatusLabel[row.mapping_status] ?? row.mapping_status}</td></tr>)}
        {!loading && data.skuMappings.length === 0 ? <tr><td colSpan={5} className={styles.empty}>暂无 SKU 映射</td></tr> : null}
      </tbody></table></div>
    </section>

    <section className={styles.panel}>
      <div className={styles.heading}><div><span className={styles.eyebrow}>SYNC EVIDENCE</span><h2>同步与对账记录</h2><p>显示真实保存的任务记录；当前没有配置可执行的同步任务。</p></div></div>
      <div className={styles.tableWrap}><table><thead><tr><th>服务商</th><th>任务</th><th>状态</th><th>记录数</th><th>错误码</th><th>创建时间</th></tr></thead><tbody>
        {data.syncRuns.map(run => <tr key={run.id}><td>{run.provider_name}</td><td>{syncTypeLabel[run.sync_type] ?? run.sync_type}</td><td>{syncStatusLabel[run.status] ?? run.status}</td><td>{run.records_seen} / 接受 {run.records_accepted} / 拒绝 {run.records_rejected}</td><td>{run.error_code ?? '—'}{run.retryable ? ' · 可重试' : ''}</td><td>{time(run.created_at)}</td></tr>)}
        {!loading && data.syncRuns.length === 0 ? <tr><td colSpan={6} className={styles.empty}>暂无同步记录</td></tr> : null}
      </tbody></table></div>
    </section>
  </div>;
}
