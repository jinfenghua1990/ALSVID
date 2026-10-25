'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TODO_SOURCES,
  mergeTodoItems,
  parseTodoSource,
  type TodoSourceDef,
  type TodoSourceResult,
} from './live-workbench-todos-contract';
import styles from './live-workbench-todos.module.css';

type Results = Record<string, TodoSourceResult>;

async function querySource(source: TodoSourceDef, signal: AbortSignal): Promise<TodoSourceResult> {
  try {
    const response = await fetch('/api/control' + source.path, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    if (response.status === 401) return { state: 'unauthorized', reason: 'login' };
    if (response.status === 403) return { state: 'unauthorized', reason: 'permission' };
    if (!response.ok) {
      return { state: 'unavailable', reason: '接口读取失败（HTTP ' + response.status + '）' };
    }
    const payload: unknown = await response.json();
    return parseTodoSource(source, payload, new Date().toLocaleString('zh-CN', { hour12: false }));
  } catch (error) {
    if (signal.aborted) return { state: 'loading' };
    return { state: 'unavailable', reason: error instanceof Error ? error.message : '网络异常' };
  }
}

function sourceStatus(result: TodoSourceResult | undefined): string {
  if (!result || result.state === 'loading') return '读取中';
  if (result.state === 'ready') return result.items.length + ' 条待办';
  if (result.state === 'unauthorized') {
    return result.reason === 'login' ? '登录过期' : '无权限';
  }
  return '读取失败';
}

/**
 * Read-only Admin workbench todos. Empty means no matching records under the
 * current session — never invents KPIs. Failed or unauthorized sources stay
 * explicit and are not treated as zero.
 */
export function LiveWorkbenchTodos() {
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState('');

  const reload = useCallback(async (external?: AbortSignal) => {
    const local = external ? null : new AbortController();
    const signal = external ?? local!.signal;
    setLoading(true);
    setResults(Object.fromEntries(TODO_SOURCES.map((source) => [source.key, { state: 'loading' as const }])));
    const outcomes = await Promise.all(
      TODO_SOURCES.map(async (source) => ({
        key: source.key,
        result: await querySource(source, signal),
      })),
    );
    if (signal.aborted) return;
    setResults(Object.fromEntries(outcomes.map((item) => [item.key, item.result])));
    setCheckedAt(new Date().toLocaleString('zh-CN', { hour12: false }));
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const ordered = TODO_SOURCES.map((source) => results[source.key] ?? { state: 'loading' as const });
  const { items, readyCount, blocked } = mergeTodoItems(ordered);
  const visible = items.slice(0, 12);

  return (
    <section className={styles.root} aria-label="真实业务待办">
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>最近任务 · 已接入业务</h2>
          <p className={styles.hint}>
            从商品发布、售后工单和自建商城订单读取当前账号可见的待处理记录；不使用设计示例，也不代表生产验收完成。
          </p>
        </div>
        <div className={styles.toolbar}>
          <span className={styles.timestamp} role="status">
            {checkedAt ? '读取时间：' + checkedAt : '尚未完成读取'}
          </span>
          <button type="button" className={styles.reload} disabled={loading} onClick={() => { void reload(); }}>
            {loading ? '读取中…' : '刷新待办'}
          </button>
        </div>
      </div>

      <div className={styles.sources} aria-label="待办数据源状态">
        {TODO_SOURCES.map((source) => {
          const result = results[source.key];
          const tone =
            result?.state === 'ready'
              ? 'ready'
              : result?.state === 'unauthorized' || result?.state === 'unavailable'
                ? 'error'
                : 'pending';
          return (
            <a key={source.key} className={styles.source} data-tone={tone} href={source.href}>
              <strong>{source.label}</strong>
              <span>{sourceStatus(result)}</span>
            </a>
          );
        })}
      </div>

      {blocked > 0 ? (
        <p className={styles.warning} role="alert">
          {blocked} 个数据源不可用或无权限。失败来源不按 0 条待办计算；其余已授权来源仍可查看。
        </p>
      ) : null}

      {loading && readyCount === 0 ? (
        <p className={styles.empty} role="status">正在读取授权范围内的待办…</p>
      ) : visible.length === 0 ? (
        <p className={styles.empty} role="status">
          {readyCount === 0
            ? '暂无已成功读取的待办来源。'
            : '当前授权范围内没有待审核发布、开放售后工单或需关注的商城订单。'}
        </p>
      ) : (
        <ul className={styles.list}>
          {visible.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.itemTop}>
                <a href={item.href}>{item.title}</a>
                <span className={styles.badge}>{item.status}</span>
              </div>
              <p className={styles.detail}>{item.detail}</p>
            </li>
          ))}
        </ul>
      )}

      {items.length > visible.length ? (
        <p className={styles.more}>
          另有 {items.length - visible.length} 条未展开显示；请进入对应业务模块处理完整列表。
        </p>
      ) : null}
    </section>
  );
}
