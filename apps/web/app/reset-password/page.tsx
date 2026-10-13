'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './reset-password.module.css';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    const endpoint = token ? '/api/session/password-reset/confirm' : '/api/session/password-reset/request';
    const body = token ? { token, password: form.get('password') } : { email: form.get('email') };
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) {
        setError(payload?.message ?? '操作失败，请稍后重试。');
        return;
      }
      if (token) {
        router.replace('/login?reason=password-reset');
        return;
      }
      setMessage('如果该邮箱已注册，重置链接已发送。请检查收件箱和垃圾邮件。');
    } catch {
      setError('无法连接密码服务，请稍后重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>ALSVID</div>
        <div className={styles.eyebrow}>账户安全</div>
        <h1>{token ? '设置新密码' : '忘记密码'}</h1>
        <p>{token ? '设置成功后，之前的登录会话会失效。' : '输入注册邮箱，我们会发送一次性重置链接。'}</p>
        <form onSubmit={submit}>
          {token ? <label>新密码<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label> : <label>注册邮箱<input name="email" type="email" autoComplete="email" required /></label>}
          {error ? <div className={styles.error}>{error}</div> : null}
          {message ? <div className={styles.success}>{message}</div> : null}
          <button disabled={busy}>{busy ? '处理中…' : token ? '保存新密码' : '发送重置链接'}</button>
          <a href="/login">返回登录</a>
        </form>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className={styles.page} />}><ResetPasswordForm /></Suspense>;
}
