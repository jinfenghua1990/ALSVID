'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

interface LoginResponse { message?: string }

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'portal-access-denied') setError('此账号已登录，但没有当前管理页面所需的 system_admin 权限。请联系管理员分配角色。');
    else if (reason === 'session-expired') setError('登录状态已失效，请重新登录。');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/session/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const payload = await response.json().catch(() => null) as LoginResponse | null;
      if (!response.ok) { setError(payload?.message ?? '登录失败，请检查邮箱和密码'); return; }
      router.replace('/'); router.refresh();
    } catch { setError('无法连接登录服务，请稍后重试。'); }
    finally { setBusy(false); }
  }

  return <main className="authPage"><section className="authCard">
    <div className="brand">ALSVID</div><div className="eyebrow">内部管理控制台</div>
    <h1 className="authTitle">密码备用登录</h1>
    <p><a href="/">返回登录中心使用公司邮箱验证码（推荐）</a></p>
    <form className="stack" onSubmit={submit}>
      <label>邮箱<input name="email" type="email" autoComplete="username" required /></label>
      <label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
      {error ? <p className="formError">{error}</p> : null}
      <button className="primaryButton" disabled={busy}>{busy ? '正在登录…' : '密码登录'}</button>
    </form>
  </section></main>;
}
