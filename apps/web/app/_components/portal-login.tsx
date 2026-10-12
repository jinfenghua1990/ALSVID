'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../portal-launcher/portal-launcher.module.css';

interface LoginResponse {
  data?: { roles?: string[] };
  message?: string;
}

// Wraps the portal launcher content. When signed out, portal navigation is
// intercepted and the login dialog opens instead; signing in via the dialog
// refreshes the server components so the authenticated view appears in place.
export function PortalLoginGate({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!authenticated);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function openDialog() {
    setError('');
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const payload = await response.json().catch(() => null) as LoginResponse | null;

      if (!response.ok) {
        setError(payload?.message ?? '登录失败，请检查用户名和密码');
        setBusy(false);
        return;
      }

      const roles = payload?.data?.roles;
      if (!Array.isArray(roles) || !roles.includes('system_admin')) {
        setError('账号验证成功，但没有 ALSVID 内部管理权限。请联系管理员分配 system_admin 角色。');
        setBusy(false);
        return;
      }

      // Do not close the dialog optimistically. Keep it visible until the
      // refreshed server view confirms the session cookie and renders the
      // authenticated launcher. This avoids the old "flash out" failure mode.
      router.refresh();
      setBusy(false);
    } catch {
      setError('无法连接登录服务，请稍后重试。');
      setBusy(false);
    }
  }

  function handleClickCapture(event: MouseEvent) {
    if (authenticated) return;
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
    openDialog();
  }

  return (
    <>
      <div onClickCapture={handleClickCapture}>{children}</div>
      {!authenticated && !open ? (
        <button className={styles.loginButton} onClick={openDialog}>登录</button>
      ) : null}
      {open && !authenticated ? (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="登录 ALSVID" onClick={(event) => event.stopPropagation()}>
            <button className={styles.dialogClose} onClick={() => setOpen(false)} aria-label="关闭">×</button>
            <p className={styles.dialogKicker}>ALSVID ID</p>
            <h2>登录中心</h2>
            <p className={styles.dialogLead}>使用你的 ALSVID 账号继续访问内部管理中心、经销商门户与我的 ALSVID。</p>
            <form className={styles.dialogForm} onSubmit={submit}>
              <label>用户名<input name="email" type="text" autoComplete="username" required /></label>
              <label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
              {error ? <p className={styles.dialogError}>{error}</p> : null}
              <button className={styles.dialogSubmit} disabled={busy}>{busy ? '正在登录…' : '登 录'}</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
