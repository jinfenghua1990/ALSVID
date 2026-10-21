'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { translator } from '../_lib/i18n';
import { isLocale } from '../_lib/i18n/routing';
import type { ProtectedPortalId } from '../_lib/portal-routing';
import styles from './reset-password.module.css';

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const rawPortal = params.get('portal');
  const portal: ProtectedPortalId = rawPortal === 'dealer' || rawPortal === 'supplier' || rawPortal === 'my' ? rawPortal : 'admin';
  const rawLocale = params.get('locale');
  const locale = isLocale(rawLocale) ? rawLocale : 'zh';
  const t = translator(locale);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!token) router.replace(`/${locale}/login?portal=${encodeURIComponent(portal)}&forgot=1`);
  }, [token, locale, portal, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || completed) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/session/password-reset/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password: form.get('password') }),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) {
        setError(payload?.message ?? t('auth.reset_invalid'));
        return;
      }
      setCompleted(true);
    } catch {
      setError(t('auth.reset_service_failed'));
    } finally {
      setBusy(false);
    }
  }

  if (!token) return null;

  return (
    <main className={styles.page} lang={locale}>
      <section className={styles.card}>
        <a className={styles.brand} href={`/${locale}`}>ALSVID</a>
        <div className={styles.eyebrow}>ACCOUNT SECURITY</div>
        <h1>{t('auth.reset_title')}</h1>
        <p className={styles.description}>{t('auth.reset_description')}</p>
        {completed ? (
          <div className={styles.success} role="status">
            <p>{t('auth.reset_success')}</p>
            <a className={styles.back} href={`/${locale}/login?portal=${encodeURIComponent(portal)}`}>{t('auth.reset_back')}</a>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>{t('auth.reset_password_label')}
              <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder={t('auth.reset_password_placeholder')} required />
            </label>
            {error ? <div className={styles.error} role="alert">{error}</div> : null}
            <button disabled={busy}>{busy ? t('auth.reset_saving') : t('auth.reset_submit')}</button>
            <a className={styles.back} href={`/${locale}/login?portal=${encodeURIComponent(portal)}`}>{t('auth.reset_back')}</a>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className={styles.page} />}><ResetPasswordForm /></Suspense>;
}
