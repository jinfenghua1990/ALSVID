'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  P0_AREAS,
  P0_READ_SOURCES,
  parseP0Source,
  type P0AreaKey,
  type P0ReadSource,
  type P0SourceResult,
} from './p0-operations-contract';
import styles from './p0-operations-center.module.css';

type Results = Record<string, P0SourceResult>;

async function querySource(source: P0ReadSource, signal: AbortSignal): Promise<P0SourceResult> {
  try {
    const response = await fetch('/api/control' + source.path, {
      cache: 'no-store', method: 'GET', signal,
    });
    if (response.status === 401) return { state: 'unauthorized', reason: 'login' };
    if (response.status === 403) return { state: 'unauthorized', reason: 'permission' };
    if (!response.ok) return { state: 'unavailable', reason: '接口读取失败（HTTP ' + response.status + '）' };
    const payload: unknown = await response.json();
    return parseP0Source(source, payload, new Date().toLocaleString('zh-CN', { hour12: false }));
  } catch (error) {
    if (signal.aborted) return { state: 'loading' };
    return { state: 'unavailable', reason: error instanceof Error ? error.message : '网络异常' };
  }
}

function resultTitle(result: P0SourceResult | undefined): string {
  if (!result || result.state === 'loading') return '读取中';
  if (result.state === 'ready') return '已读取';
  if (result.state === 'unauthorized') return result.reason === 'login' ? '登录过期' : '权限不足';
  return '读取失败';
}

const gateLabels = { pending: '待开发', external: '待外部条件', verify: '待业务验收' } as const;

/**
 * Read-only P0 command center. Never equates a reachable API with operational
 * acceptance or a balance with sellable stock. All mutations stay in domains.
 */
export function P0OperationsCenter() {
  const [active, setActive] = useState<P0AreaKey>('orders');
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState('');
  const currentRequest = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    setLoading(true);
    setResults(Object.fromEntries(P0_READ_SOURCES.map(source => [source.key, { state: 'loading' }])));
    const responses = await Promise.all(P0_READ_SOURCES.map(async source =>
      ({ key: source.key, result: await querySource(source, controller.signal) })));
    if (controller.signal.aborted) return;
    setResults(Object.fromEntries(responses.map(response => [response.key, response.result])));
    setRefreshedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    return () => currentRequest.current?.abort();
  }, [reload]);

  const selected = P0_AREAS.find(area => area.key === active) ?? P0_AREAS[0]!;
  const selectedSources = P0_READ_SOURCES.filter(source => selected.sourceKeys.includes(source.key));
  const failures = P0_READ_SOURCES.filter(source => {
    const state = results[source.key]?.state;
    return state === 'unauthorized' || state === 'unavailable';
  });

  return <section className={styles.root} id="p0-operations" aria-label="P0 核心运营中心">
    <header className={styles.header}>
      <div>
        <div className={styles.eyebrow}><span className={styles.dot} /> PRIORITY 0 · ALSVID ADMIN</div>
        <h2 className={styles.heading}>核心业务运营中心</h2>
        <p className={styles.intro}>产品、订单、库存、生产、系统设置。查看真实数据的读取状态，识别未完成的业务门禁，再进入已有业务页面处理。</p>
      </div>
      <div className={styles.toolbar}>
        <span className={styles.timestamp}>最近读取：{refreshedAt || '尚未完成'}</span>
        <button type="button" className={styles.reload} disabled={loading} onClick={() => { void reload(); }}>
          {loading ? '正在刷新…' : '刷新业务数据'}
        </button>
      </div>
    </header>

    {failures.length > 0 ? <p className={styles.warning} role="alert">
      部分数据源不可用：{failures.map(source => source.label + '（' + resultTitle(results[source.key]) + '）').join('、')}。
      未授权或读取失败的来源不按零条数据计算；其它授权来源仍可查看。
    </p> : null}

    <div className={styles.moduleGrid} role="group" aria-label="选择 P0 模块">
      {P0_AREAS.map(area => {
        const sourceResults = area.sourceKeys.map(key => results[key]);
        const ready = sourceResults.filter(result => result?.state === 'ready').length;
        const missing = sourceResults.some(result => result?.state === 'unauthorized' || result?.state === 'unavailable');
        return <button key={area.key} type="button" className={styles.module} data-active={active === area.key}
          aria-pressed={active === area.key} onClick={() => setActive(area.key)}>
          <span className={styles.moduleTop}><strong>{area.title}</strong><span className={styles.chevron} aria-hidden="true">→</span></span>
          <span className={styles.moduleDescription}>{area.description}</span>
          <span className={styles.moduleStatus} data-tone={missing ? 'error' : ready === area.sourceKeys.length ? 'readable' : 'pending'}>
            {missing ? '部分数据不可用' : ready === area.sourceKeys.length ? '可读取 · 非业务验收' : '数据读取中'}
          </span>
        </button>;
      })}
    </div>

    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <div>
          <span className={styles.detailKicker}>业务域 · {selected.owner}</span>
          <h3>{selected.title}</h3>
          <p>{selected.description}</p>
        </div>
        <a className={styles.entry} href={selected.href}>{selected.action} <span aria-hidden="true">→</span></a>
      </div>
      <div className={styles.detailColumns}>
        <section className={styles.panel} aria-label="来源与已接入能力">
          <h4>授权业务数据</h4>
          <div className={styles.metricGrid}>
            {selectedSources.map(source => {
              const result = results[source.key];
              return <div key={source.key} className={styles.metric}>
                <span className={styles.metricLabel}>{source.label} · 记录条目</span>
                <strong className={styles.metricValue}>{result?.state === 'ready' ? result.count.toLocaleString() : '—'}</strong>
                <small className={styles.metricNote}>
                  {result?.state === 'ready'
                    ? source.secondaryField && result.secondaryCount !== undefined
                      ? source.secondaryLabel + ' ' + result.secondaryCount + ' 条 · ' + result.checkedAt
                      : '读取时间 ' + result.checkedAt
                    : result?.state === 'unauthorized'
                      ? result.reason === 'login' ? '会话已过期，请重新登录' : '当前账号无读取权限'
                      : result?.state === 'unavailable'
                        ? result.reason + '，不能按 0 条处理'
                        : '正在查询当前授权的数据'}
                </small>
              </div>;
            })}
          </div>
          <h4 className={styles.subheading}>已存在的业务基础</h4>
          <ul className={styles.existing}>
            {selected.existing.map(item => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className={styles.panel} aria-label="未完成的 P0 门禁">
          <div className={styles.gateHeading}>
            <h4>关键业务门禁</h4>
            <span>{selected.gates.length} 项需继续处理</span>
          </div>
          <div className={styles.gates}>
            {selected.gates.map(gate => <article className={styles.gate} key={gate.label}>
              <div className={styles.gateTitle}><strong>{gate.label}</strong><span data-state={gate.state}>{gateLabels[gate.state]}</span></div>
              <p>{gate.detail}</p>
            </article>)}
          </div>
        </section>
      </div>
    </div>
    <footer className={styles.footer}>
      <span>统计口径：API 返回的记录条目数，不是营业额、可售数量、实时仓库库存或真实付款结果。</span>
      <a href="/admin/architecture">查看系统数据与职责边界 →</a>
    </footer>
  </section>;
}
