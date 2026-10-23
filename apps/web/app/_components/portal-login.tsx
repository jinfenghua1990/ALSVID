'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';
import { translator, type Locale, type TranslationKey } from '../_lib/i18n';
import type { ProtectedPortalId } from '../_lib/portal-routing';
import { PortalLoginScene } from './portal-login-scene';
import styles from './portal-login-scene.module.css';

interface AuthResponse { data?: { testCode?: string; firstAdminActivated?: boolean; passwordSetupRequired?: boolean }; message?: string; }
type LoginMethod = 'email' | 'password' | 'setup';

export function PortalLoginGate({ portal = 'admin', locale = 'zh', authenticated, passwordSetupRequired = false, redirectTo = '/admin', passwordLoginEnabled = false, forgotPasswordRequested = false, resetToken = '', openOnLoad = false }: {
  portal?: ProtectedPortalId; locale?: Locale; authenticated: boolean; passwordSetupRequired?: boolean;
  redirectTo?: string; passwordLoginEnabled?: boolean; forgotPasswordRequested?: boolean; resetToken?: string; openOnLoad?: boolean;
}) {
  const t = translator(locale);
  const formId = useId();
  const [open, setOpen] = useState(passwordSetupRequired || forgotPasswordRequested || Boolean(resetToken) || openOnLoad);
  const [method, setMethod] = useState<LoginMethod>(passwordSetupRequired ? 'setup' : passwordLoginEnabled ? 'password' : 'email');
  const [forgotOpen, setForgotOpen] = useState(forgotPasswordRequested && !resetToken);
  const [activeResetToken, setActiveResetToken] = useState(resetToken);
  const [resetTokenComplete, setResetTokenComplete] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
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
  const closeForgotPassword = useCallback(() => {
    if (resetBusy) return;
    setForgotOpen(false);
    if (activeResetToken || resetTokenComplete) {
      setActiveResetToken('');
      setResetTokenComplete(false);
      setResetError('');
      setResetNotice('');
      router.replace(`/${locale}/login?portal=${encodeURIComponent(portal)}`);
    }
  }, [resetBusy, activeResetToken, resetTokenComplete, router, locale, portal]);
  useEffect(() => {
    setSetupRequired(passwordSetupRequired);
    if (passwordSetupRequired) { setMethod('setup'); setOpen(true); }
    else if (authenticated) setOpen(false);
  }, [authenticated, passwordSetupRequired]);
  useEffect(() => {
    try { const saved = localStorage.getItem('alsvid-login-email:' + portal); if (saved) { setIdentifier(saved); setRemember(true); } } catch { /* Storage is optional. */ }
  }, [portal]);
  useEffect(() => {
    if (!resetToken) return;
    setActiveResetToken(resetToken);
    setResetTokenComplete(false);
    setForgotOpen(false);
    setResetError('');
    setResetNotice('');
    setOpen(true);
  }, [resetToken]);
  useEffect(() => {
    if (!forgotOpen && !activeResetToken && !resetTokenComplete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        if (!resetBusy) closeForgotPassword();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [forgotOpen, activeResetToken, resetTokenComplete, resetBusy, closeForgotPassword]);
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

  async function submitPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = resetEmail.trim();
    if (!nextEmail) { setResetError(t('auth.reset_failed')); return; }
    setResetBusy(true);
    setResetError('');
    setResetNotice('');
    try {
      const response = await fetch('/api/session/password-reset/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: nextEmail, portal, locale }),
      });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setResetError(payload?.message ?? t('auth.reset_failed')); return; }
      setResetNotice(t('auth.reset_sent'));
    } catch {
      setResetError(t('auth.reset_service_failed'));
    } finally {
      setResetBusy(false);
    }
  }

  async function submitPasswordResetConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeResetToken || resetTokenComplete) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (password !== confirmPassword) {
      setResetError(t('auth.password_mismatch'));
      return;
    }
    setResetBusy(true);
    setResetError('');
    setResetNotice('');
    try {
      const response = await fetch('/api/session/password-reset/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: activeResetToken, password }),
      });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) {
        setResetError(payload?.message ?? t('auth.reset_invalid'));
        return;
      }
      setActiveResetToken('');
      setResetTokenComplete(true);
      setResetNotice('');
      window.history.replaceState(null, '', `/${locale}/login?portal=${encodeURIComponent(portal)}`);
    } catch {
      setResetError(t('auth.reset_service_failed'));
    } finally {
      setResetBusy(false);
    }
  }

  function openForgotPassword() {
    setResetEmail(email || identifier);
    setResetError('');
    setResetNotice('');
    setForgotOpen(true);
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
  const resetTokenMode = Boolean(activeResetToken) || resetTokenComplete;
  const actionLabel = setupRequired ? t('auth.save_password') : method === 'password' ? t(('auth.' + portal + '.submit') as TranslationKey) : t(codeRequested ? 'auth.verify' : 'auth.send_code');
  return <>
    <PortalLoginScene portal={portal} locale={locale} open={open} busy={busy} locked={setupRequired} formId={formId} actionLabel={actionLabel} onOpen={openDialog} onClose={closeDialog}>
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
      <button type="button" onClick={openForgotPassword}>{t('auth.forgot')}</button>
      {portal === 'dealer' ? <a href={'https://www.alsvidbike.com/' + locale + '/dealers?apply=1'}>{t('auth.apply')}</a> : null}
      {codeRequested ? <button type="button" disabled={busy} onClick={() => { setCodeRequested(false); setVerificationCode(''); setNotice(''); setError(''); }}>{t('auth.resend')}</button> : null}
    </div> : null}
    </PortalLoginScene>
    {(forgotOpen || activeResetToken || resetTokenComplete) ? <div className={styles.resetOverlay} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeForgotPassword(); }}>
      <section className={styles.resetDialog} role="dialog" aria-modal="true" aria-labelledby="alsvid-reset-dialog-title">
        <button type="button" className={styles.resetClose} aria-label={t('auth.close')} disabled={resetBusy} onClick={closeForgotPassword}>×</button>
        <div className={styles.resetBrand}>ALSVID <span>ACCOUNT SECURITY</span></div>
        <h2 id="alsvid-reset-dialog-title">{resetTokenMode ? t('auth.reset_title') : t('auth.forgot')}</h2>
        <p className={styles.resetDescription}>{resetTokenMode ? t('auth.reset_description') : t('auth.reset_modal_description')}</p>
        {resetTokenComplete ? <div className={styles.resetStatus} role="status">
          <p>{t('auth.reset_success')}</p>
          <button type="button" className={styles.resetSubmit} onClick={closeForgotPassword}>{t('auth.reset_back')}</button>
        </div> : <form className={styles.resetForm} onSubmit={resetTokenMode ? submitPasswordResetConfirm : submitPasswordReset}>
          {resetTokenMode ? <>
            <label className={styles.resetField}>{t('auth.reset_password_label')}
              <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder={t('auth.reset_password_placeholder')} required autoFocus />
            </label>
            <label className={styles.resetField}>{t('auth.confirm_password')}
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder={t('auth.confirm_password')} required />
            </label>
          </> : <label className={styles.resetField}>{emailLabel}
            <input name="resetEmail" type="email" autoComplete="email" placeholder={t('auth.email_placeholder')} value={resetEmail} onChange={event => setResetEmail(event.target.value)} required autoFocus />
          </label>}
          {resetNotice ? <p className={styles.resetStatus} role="status">{resetNotice}</p> : null}
          {resetError ? <p className={styles.resetError} role="alert">{resetError}</p> : null}
          <div className={styles.resetActions}>
            <button type="submit" className={styles.resetSubmit} disabled={resetBusy}>{resetBusy ? (resetTokenMode ? t('auth.reset_saving') : t('auth.reset_sending')) : (resetTokenMode ? t('auth.reset_submit') : t('auth.reset_send'))}</button>
            <button type="button" className={styles.resetSecondary} disabled={resetBusy} onClick={closeForgotPassword}>{resetTokenMode ? t('auth.reset_back') : t('auth.reset_close')}</button>
          </div>
        </form>}
      </section>
    </div> : null}
  </>;
}
