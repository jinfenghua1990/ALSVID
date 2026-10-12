'use client';

import { useRouter } from 'next/navigation';
import { useState, type MouseEvent, type ReactNode } from 'react';
import styles from '../portal-launcher/portal-launcher.module.css';
import loginStyles from './portal-login.module.css';

interface AuthResponse {
  data?: { testCode?: string; firstAdminActivated?: boolean };
  message?: string;
}

export function PortalLoginGate({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!authenticated);
  const [method, setMethod] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function openDialog() { setError(''); setNotice(''); setOpen(true); }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      if (!codeRequested) {
        const nextEmail = String(form.get('email') ?? '').trim();
        const nextName = String(form.get('displayName') ?? '').trim();
        const response = await fetch('/api/session/email/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: nextEmail }) });
        const payload = await response.json().catch(() => null) as AuthResponse | null;
        if (!response.ok) { setError(payload?.message ?? '无法发送验证码，请确认使用已获准的公司邮箱。'); return; }
        setEmail(nextEmail); setDisplayName(nextName); setCodeRequested(true);
        setNotice(payload?.data?.testCode ? `开发/测试验证码：${payload.data.testCode}` : '验证码已发送到你的公司邮箱，请在 10 分钟内完成验证。');
        return;
      }
      const response = await fetch('/api/session/email/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, displayName, code: form.get('code') }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? '验证码无效或已过期，请重新获取。'); return; }
      setNotice(payload?.data?.firstAdminActivated ? '首位管理员已安全激活。' : '邮箱验证成功。');
      router.refresh();
    } catch { setError('无法连接登录服务，请稍后重试。'); }
    finally { setBusy(false); }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/session/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? '登录失败，请检查邮箱和密码。'); return; }
      router.refresh();
    } catch { setError('无法连接登录服务，请稍后重试。'); }
    finally { setBusy(false); }
  }

  function switchMethod(next: 'email' | 'password') { setMethod(next); setError(''); setNotice(''); setCodeRequested(false); }
  function handleClickCapture(event: MouseEvent) {
    if (authenticated) return;
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    event.preventDefault(); event.stopPropagation(); openDialog();
  }

  return <>
    <div onClickCapture={handleClickCapture}>{children}</div>
    {!authenticated && !open ? <button className={styles.loginButton} onClick={openDialog}>登录</button> : null}
    {open && !authenticated ? <div className={styles.overlay} onClick={() => setOpen(false)}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="登录 ALSVID" onClick={(event) => event.stopPropagation()}>
        <button className={styles.dialogClose} onClick={() => setOpen(false)} aria-label="关闭">×</button>
        <p className={styles.dialogKicker}>ALSVID ID</p><h2>登录中心</h2>
        <p className={styles.dialogLead}>内部员工优先使用已获准的公司邮箱验证登录。首次验证会创建 ALSVID 账号；权限仍由 ALSVID 角色控制。</p>
        <div className={loginStyles.tabs}>
          <button className={method === 'email' ? loginStyles.tabActive : loginStyles.tab} type="button" onClick={() => switchMethod('email')}>邮箱验证码</button>
          <button className={method === 'password' ? loginStyles.tabActive : loginStyles.tab} type="button" onClick={() => switchMethod('password')}>账户密码</button>
        </div>
        {method === 'email' ? <form className={styles.dialogForm} onSubmit={submitEmail}>
          {!codeRequested ? <><label>公司邮箱<input name="email" type="email" autoComplete="email" required /></label><label>姓名（首次注册可选）<input name="displayName" type="text" autoComplete="name" /></label></> : <><label>公司邮箱<input value={email} readOnly /></label><label>6 位验证码<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></label></>}
          {notice ? <p className={loginStyles.notice}>{notice}</p> : null}{error ? <p className={styles.dialogError}>{error}</p> : null}
          <button className={styles.dialogSubmit} disabled={busy}>{busy ? '处理中…' : codeRequested ? '验证并登录' : '发送验证码'}</button>
          {codeRequested ? <button className={loginStyles.secondary} type="button" disabled={busy} onClick={() => { setCodeRequested(false); setNotice(''); setError(''); }}>更换邮箱 / 重新获取</button> : null}
        </form> : <form className={styles.dialogForm} onSubmit={submitPassword}>
          <label>邮箱<input name="email" type="email" autoComplete="username" placeholder="name@company.com" required /></label><label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
          {error ? <p className={styles.dialogError}>{error}</p> : null}<button className={styles.dialogSubmit} disabled={busy}>{busy ? '正在登录…' : '账户密码登录'}</button>
        </form>}
      </section>
    </div> : null}
  </>;
}
