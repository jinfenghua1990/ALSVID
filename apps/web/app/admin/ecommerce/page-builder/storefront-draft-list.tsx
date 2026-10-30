'use client';

import { useEffect, useState } from 'react';

type Draft = { version: number; updatedAt: string };

export default function StorefrontDraftList() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/control/v1/commerce/storefront/layout-draft', { cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message ?? '读取失败');
        if (payload.data !== null && (typeof payload.data?.version !== 'number' || typeof payload.data?.updatedAt !== 'string')) throw new Error('草稿数据格式异常');
        setDraft(payload.data);
        setState('ready');
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : '读取失败');
        setState('error');
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  return <section className="av-card" aria-label="商城装修记录">
    <div className="av-cardhead">
      <h1 className="av-cardtitle">商城装修记录</h1>
      {state === 'ready' && !draft ? <a className="av-btn" data-variant="primary" href="/admin/ecommerce/page-builder/edit">新建首页装修</a> : null}
    </div>
    {state === 'loading' ? <p role="status">正在读取装修记录…</p> : null}
    {state === 'error' ? <p role="alert">装修记录读取失败：{error}。请刷新重试。</p> : null}
    {state === 'ready' && !draft ? <p>暂无已保存的首页装修草稿。</p> : null}
    {state === 'ready' && draft ? <div style={{ overflowX: 'auto' }}><table className="av-table">
      <thead><tr><th>页面</th><th>状态</th><th>版本</th><th>最近保存</th><th>操作</th></tr></thead>
      <tbody><tr><td>商城首页</td><td>草稿</td><td>{draft.version}</td><td>{new Date(draft.updatedAt).toLocaleString('zh-CN')}</td><td><a href="/admin/ecommerce/page-builder/edit">编辑</a></td></tr></tbody>
    </table></div> : null}
  </section>;
}
