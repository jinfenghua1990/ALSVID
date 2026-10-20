'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { translator, type Locale, type TranslationKey } from '../_lib/i18n';
import type { ProtectedPortalId } from '../_lib/portal-routing';
import { PortalLoginScene } from './portal-login-scene';
import styles from './portal-login-scene.module.css';

interface AuthResponse { data?: { testCode?: string; firstAdminActivated?: boolean; passwordSetupRequired?: boolean }; message?: string; }
type LoginMethod = 'email' | 'password' | 'setup';

export function PortalLoginGate({ portal = 'admin', locale = 'zh', authenticated, passwordSetupRequired = false, redirectTo = '/admin', passwordLoginEnabled = false }: {
  portal?: ProtectedPortalId; locale?: Locale; authenticated: boolean; passwordSetupRequired?: boolean;
  redirectTo?: string; passwordLoginEnabled?: boolean;
}) {
  const t = translator(locale);
  const formId = useId();
  const [open, setOpen] = useState(passwordSetupRequired);
  const [method, setMethod] = useState<LoginMethod>(passwordSetupRequired ? 'setup' : 'email');
  const [setupRequired, setSetupRequired] = useState(passwordSetupRequired);
  const [identifier, setIdentifier] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setSetupRequired(passwordSetupRequired);
    if (passwordSetupRequired) { setMethod('setup'); setOpen(true); }
    else if (authenticated) setOpen(false);
  }, [authenticated, passwordSetupRequired]);
  useEffect(() => {
    try { const saved = localStorage.getItem('alsvid-login-email:' + portal); if (saved) { setIdentifier(saved); setRemember(true); } } catch { /* Storage is optional. */ }
  }, [portal]);
  function rememberIdentifier(value: string) {
    try { if (remember) localStorage.setItem('alsvid-login-email:' + portal, value.trim()); else localStorage.removeItem('alsvid-login-email:' + portal); } catch { /* Do not block login when storage is unavailable. */ }
  }
  function openDialog() { if (!open) { setError(''); setNotice(''); setOpen(true); } }
  function closeDialog() { if (!setupRequired && !busy) setOpen(false); }
  function continueAfterAuthentication(payload: AuthResponse | null) {
    if (payload?.data?.passwordSetupRequired) {
      setSetupRequired(true);
      setMethod('setup');
      setOpen(true);
      setNotice(t('auth.setup_required'));
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      if (!codeRequested) {
        const nextEmail = String(form.get('email') ?? '').trim();
        const nextName = String(form.get('displayName') ?? '').trim();
        rememberIdentifier(nextEmail);
        const response = await fetch('/api/session/email/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: nextEmail, portal }) });
        const payload = await response.json().catch(() => null) as AuthResponse | null;
        if (!response.ok) { setError(payload?.message ?? t('auth.sending_failed')); return; }
        setEmail(nextEmail); setDisplayName(nextName); setVerificationCode(''); setCodeRequested(true);
        setNotice(payload?.data?.testCode ? t('auth.test_code', { code: payload.data.testCode }) : t('auth.code_sent'));
        return;
      }
      const response = await fetch('/api/session/email/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, displayName, code: form.get('code'), portal }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? t('auth.code_invalid')); return; }
      if (payload?.data?.firstAdminActivated) setNotice(t('auth.first_admin'));
      continueAfterAuthentication(payload);
    } catch { setError(t('auth.service_failed')); }
    finally { setBusy(false); }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordLoginEnabled) return; rememberIdentifier(identifier); setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/session/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password'), portal }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? t('auth.login_failed')); return; }
      continueAfterAuthentication(payload);
    } catch { setError(t('auth.service_failed')); }
    finally { setBusy(false); }
  }

  async function submitPasswordSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const password = String(form.get('password') ?? '');
      const confirmPassword = String(form.get('confirmPassword') ?? '');
      if (password !== confirmPassword) { setError(t('auth.password_mismatch')); return; }
      const response = await fetch('/api/session/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password, portal }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? t('auth.password_save_failed')); return; }
      setSetupRequired(false);
      setNotice(t('auth.password_saved'));
      router.replace(redirectTo);
      router.refresh();
    } catch { setError(t('auth.service_failed')); }
    finally { setBusy(false); }
  }

  function switchMethod(next: 'email' | 'password') { if (setupRequired || (next === 'password' && !passwordLoginEnabled)) return; setMethod(next); setError(''); setNotice(''); setCodeRequested(false); setVerificationCode(''); }

  const emailLabel = t(('auth.' + portal + '.email') as TranslationKey);
  const actionLabel = setupRequired ? t('auth.save_password') : method === 'password' ? t(('auth.' + portal + '.submit') as TranslationKey) : t(codeRequested ? 'auth.verify' : 'auth.send_code');
  return <PortalLoginScene portal={portal} locale={locale} open={open} busy={busy} locked={setupRequired} formId={formId} actionLabel={actionLabel} onOpen={openDialog} onClose={closeDialog}>
    {!setupRequired && passwordLoginEnabled ? <div className={styles.methods}>
      <button type="button" aria-pressed={method === 'email'} disabled={busy} onClick={() => switchMethod('email')}>{t('auth.email_method')}</button>
      <button type="button" aria-pressed={method === 'password'} disabled={busy} onClick={() => switchMethod('password')}>{t('auth.password_method')}</button>
    </div> : null}
    {setupRequired ? <p className={styles.setupLead}>{t('auth.setup_title')} · {t('auth.password_rules')}</p> : null}
    <form key={setupRequired ? 'setup' : method === 'password' ? 'password' : codeRequested ? 'code' : 'email'} id={formId} className={styles.form} onSubmit={setupRequired ? submitPasswordSetup : method === 'password' ? submitPassword : submitEmail}>
      {setupRequired ? <>
        <label className={styles.field}>{t('auth.new_password')}<span className={styles.inputRow}><input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></span></label>
        <label className={styles.field}>{t('auth.confirm_password')}<span className={styles.inputRow}><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></span></label>
      </> : <>
        <label className={styles.field}>{emailLabel}<span className={styles.inputRow}><input name="email" type="email" autoComplete={method === 'password' ? 'username' : 'email'} placeholder={t('auth.email_placeholder')} required value={codeRequested ? email : identifier} readOnly={codeRequested} onChange={event => setIdentifier(event.target.value)} /></span></label>
        {passwordLoginEnabled && method === 'password' ? <label className={styles.field}>{t('auth.password')}<span className={styles.inputRow}><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('auth.password_placeholder')} required /><button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{t(showPassword ? 'auth.hide' : 'auth.show')}</button></span></label> : codeRequested ? <label className={styles.field}>{t('auth.code')}<span className={styles.inputRow}><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder={t('auth.code_placeholder')} value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></span></label> : <label className={styles.field}>{t('auth.name')}<span className={styles.inputRow}><input name="displayName" type="text" autoComplete="name" /></span></label>}
      </>}
      {notice ? <p className={styles.status} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </form>
    {!setupRequired ? <div className={styles.utilities}>
      <label><input type="checkbox" checked={remember} onChange={event => { setRemember(event.target.checked); if (!event.target.checked) { try { localStorage.removeItem('alsvid-login-email:' + portal); } catch { /* Optional storage. */ } } }} />{t('auth.remember')}</label>
      <a href="/reset-password">{t('auth.forgot')}</a>
      {portal === 'dealer' ? <a href={'https://www.alsvidbike.com/' + locale + '/#dealer'}>{t('auth.apply')}</a> : null}
      {codeRequested ? <button type="button" disabled={busy} onClick={() => { setCodeRequested(false); setVerificationCode(''); setNotice(''); setError(''); }}>{t('auth.resend')}</button> : null}
    </div> : null}
  </PortalLoginScene>;
}
