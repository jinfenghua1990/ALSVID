'use client';

import { ThemeToggle } from '@alsvid/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import styles from './login.module.css';

interface LoginResponse { message?: string }

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason');
    if (reason === 'portal-access-denied') {
      setError('此账号已登录，但没有当前管理页面所需的 system_admin 权限。请联系管理员分配角色。');
    } else if (reason === 'session-expired') {
      setError('登录状态已失效，请重新登录。');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: form.get('identifier'), password: form.get('password') }),
      });
      const payload = await response.json().catch(() => null) as LoginResponse | null;

      if (!response.ok) {
        setError(payload?.message ?? '登录失败，请检查邮箱 / 手机号和密码');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('无法连接登录服务，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.visual} aria-hidden="true">
        <div className={styles.visualCopy}>
          <span>ALSVID</span>
          <h2>Explore<br />Further.</h2>
          <p>LIGHTER · SMARTER · FURTHER</p>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.top}><ThemeToggle /></div>
        <div className={styles.brand}>ALSVID</div>
        <div className={styles.eyebrow}>INTERNAL PLATFORM</div>
        <h1 className={styles.title}>账户密码登录</h1>
        <p className={styles.lead}>使用已验证邮箱或手机号登录。内部员工优先从门户登录中心使用公司邮箱验证码。</p>
        <form className={styles.form} onSubmit={submit}>
          <label>邮箱 / 手机号<input name="identifier" type="text" autoComplete="username" placeholder="name@company.com / +86..." required /></label>
          <label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button className={styles.submit} disabled={busy}>{busy ? '正在登录…' : '账户密码登录'}</button>
        </form>
        <p className={styles.foot}>ALSVID Internal · 仅限已授权账户。权限由服务端 ALSVID 角色校验，界面数据仅来自实际录入和已连接业务系统。</p>
      </section>
    </main>
  );
}
