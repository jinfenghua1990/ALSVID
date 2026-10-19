'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import styles from '../portal-launcher/portal-launcher.module.css';
import loginStyles from './portal-login.module.css';

interface AuthResponse {
  data?: { testCode?: string; firstAdminActivated?: boolean; passwordSetupRequired?: boolean };
  message?: string;
}

type LoginMethod = 'email' | 'password' | 'setup';
type LoginPortal = 'admin' | 'dealer' | 'supplier' | 'my';

const portalCopy: Record<LoginPortal, { emailLabel: string; emailHelp: string; codeNotice: string; lead: string; passwordPlaceholder: string }> = {
  admin: { emailLabel: '公司邮箱', emailHelp: '使用已获准的公司邮箱完成身份验证。', codeNotice: '验证码已发送到你的公司邮箱，请在 10 分钟内完成验证。', lead: '使用公司邮箱完成身份验证。正常登录成功后，系统会保持会话；仅账号安全或高风险操作需要额外验证。', passwordPlaceholder: 'name@company.com' },
  dealer: { emailLabel: '经销商工作邮箱', emailHelp: '使用经销商邀请的业务邮箱完成身份验证。', codeNotice: '验证码已发送到你的经销商工作邮箱，请在 10 分钟内完成验证。', lead: '使用经销商工作邮箱登录。系统只会展示该经销商被授权的公司、订单、车辆和售后数据。', passwordPlaceholder: 'name@dealer.com' },
  supplier: { emailLabel: '供应商登录邮箱', emailHelp: '仅已获准并绑定供应商组织的用户可查看本组织采购单。', codeNotice: '验证码已发送到已登记的邮箱。', lead: '供应商登录后只允许查看和确认属于自己组织的已发布采购单；库存收货仍由 ALSVID 负责。', passwordPlaceholder: 'name@supplier.com' },
  my: { emailLabel: 'Shopify 客户账户', emailHelp: '客户身份由 Shopify 客户账户验证，ALSVID 不直接创建客户邮箱账号。', codeNotice: '将跳转到 Shopify 完成客户身份验证。', lead: '使用 Shopify 客户账户登录 My ALSVID。验证成功后，ALSVID 只同步与你本人建立了真实关系的客户和车辆数据。', passwordPlaceholder: 'name@example.com' },
};

export function PortalLoginGate({ portal = 'admin', authenticated, passwordSetupRequired = false, redirectTo = '/admin', shopifyLoginUrl = '', passwordLoginEnabled = false, children }: { portal?: LoginPortal; authenticated: boolean; passwordSetupRequired?: boolean; redirectTo?: string; shopifyLoginUrl?: string; passwordLoginEnabled?: boolean; children: ReactNode }) {
  const copy = portalCopy[portal];
  const [open, setOpen] = useState(!authenticated || passwordSetupRequired);
  const [method, setMethod] = useState<LoginMethod>(passwordSetupRequired ? 'setup' : 'email');
  const [setupRequired, setSetupRequired] = useState(passwordSetupRequired);
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
    if (passwordSetupRequired) {
      setMethod('setup');
      setOpen(true);
    } else if (authenticated) {
      setOpen(false);
    }
  }, [authenticated, passwordSetupRequired]);

  function openDialog() { setError(''); setNotice(''); setOpen(true); }

  function continueAfterAuthentication(payload: AuthResponse | null) {
    if (payload?.data?.passwordSetupRequired) {
      setSetupRequired(true);
      setMethod('setup');
      setOpen(true);
      setNotice('身份验证成功。首次登录需要先设置你的个人密码。');
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
        const response = await fetch('/api/session/email/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: nextEmail, portal }) });
        const payload = await response.json().catch(() => null) as AuthResponse | null;
        if (!response.ok) { setError(payload?.message ?? '无法发送验证码，请确认使用已获准的公司邮箱。'); return; }
        setEmail(nextEmail); setDisplayName(nextName); setVerificationCode(''); setCodeRequested(true);
        setNotice(payload?.data?.testCode ? `本地开发验证码：${payload.data.testCode}` : copy.codeNotice);
        return;
      }
      const response = await fetch('/api/session/email/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, displayName, code: form.get('code'), portal }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? '验证码无效或已过期，请重新获取。'); return; }
      if (payload?.data?.firstAdminActivated) setNotice('首位管理员已安全激活。');
      continueAfterAuthentication(payload);
    } catch { setError('无法连接登录服务，请稍后重试。'); }
    finally { setBusy(false); }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordLoginEnabled) return; setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/session/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password'), portal }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? '登录失败，请检查邮箱和密码。'); return; }
      continueAfterAuthentication(payload);
    } catch { setError('无法连接登录服务，请稍后重试。'); }
    finally { setBusy(false); }
  }

  async function submitPasswordSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const password = String(form.get('password') ?? '');
      const confirmPassword = String(form.get('confirmPassword') ?? '');
      if (password !== confirmPassword) { setError('两次输入的密码不一致。'); return; }
      const response = await fetch('/api/session/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
      const payload = await response.json().catch(() => null) as AuthResponse | null;
      if (!response.ok) { setError(payload?.message ?? '密码设置失败，请重新输入。'); return; }
      setSetupRequired(false);
      setNotice('个人密码已设置。账户密码登录目前停用，可继续使用邮箱验证码。');
      router.replace(redirectTo);
      router.refresh();
    } catch { setError('无法连接密码服务，请稍后重试。'); }
    finally { setBusy(false); }
  }

  function switchMethod(next: 'email' | 'password') { if (setupRequired || (next === 'password' && !passwordLoginEnabled)) return; setMethod(next); setError(''); setNotice(''); setCodeRequested(false); setVerificationCode(''); }
  function handleClickCapture(event: MouseEvent) {
    if (authenticated && !setupRequired) return;
    const anchor = (event.target as HTMLElement).closest('a');
    if (anchor?.getAttribute('href') === '/reset-password') return;
    if (!anchor) return;
    event.preventDefault(); event.stopPropagation(); openDialog();
  }
  function closeDialog() { if (!setupRequired) setOpen(false); }

  return <>
    <div onClickCapture={handleClickCapture}>{children}</div>
    {!authenticated && !open ? <button className={styles.loginButton} onClick={openDialog}>登录</button> : null}
    {open && (!authenticated || setupRequired) ? <div className={styles.overlay} onClick={closeDialog}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label={setupRequired ? '设置 ALSVID 个人密码' : '登录 ALSVID'} onClick={(event) => event.stopPropagation()}>
        {!setupRequired ? <button className={styles.dialogClose} onClick={closeDialog} aria-label="关闭">×</button> : null}
        <p className={styles.dialogKicker}>ALSVID ID</p><h2>{setupRequired ? '设置个人密码' : '登录中心'}</h2>
        <p className={styles.dialogLead}>{setupRequired ? '身份验证已经完成。首次登录需要设置个人密码以完成账户初始化；账户密码登录方式目前仍停用，请使用邮箱验证码登录。' : '使用公司邮箱完成身份验证。正常登录成功后，系统会保持会话；仅账号安全或高风险操作需要额外验证。'}</p>
        {!setupRequired && portal !== 'my' && passwordLoginEnabled ? <div className={loginStyles.tabs}>
          <button className={method === 'email' ? loginStyles.tabActive : loginStyles.tab} type="button" onClick={() => switchMethod('email')}>邮箱验证码</button>
          <button className={method === 'password' ? loginStyles.tabActive : loginStyles.tab} type="button" onClick={() => switchMethod('password')}>账户密码</button>
        </div> : null}
        {portal === 'my' && !setupRequired ? <div className={styles.dialogForm}><p className={loginStyles.notice}>{copy.emailHelp}</p>{shopifyLoginUrl ? <a className={styles.dialogSubmit} href={shopifyLoginUrl}>使用 Shopify 客户账户登录</a> : <button className={styles.dialogSubmit} type="button" disabled>Shopify 客户登录待配置</button>}<p className={loginStyles.notice}>登录完成后会返回 My ALSVID，并在 ALSVID 内建立最小客户映射。</p></div> : null}
        {portal !== 'my' && method === 'email' && !setupRequired ? <form className={styles.dialogForm} onSubmit={submitEmail}>
          {!codeRequested ? <><label>{copy.emailLabel}<span className={loginStyles.fieldHelp}>{copy.emailHelp}</span><input key="email-input" name="email" type="email" autoComplete="email" required /></label><label>姓名（首次注册可选）<input key="display-name-input" name="displayName" type="text" autoComplete="name" /></label></> : <><label>{copy.emailLabel}<input key="verified-email-input" value={email} readOnly /></label><label>6 位验证码<input key="verification-code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label></>}
          {notice ? <p className={loginStyles.notice}>{notice}</p> : null}{error ? <p className={styles.dialogError}>{error}</p> : null}
          <button className={styles.dialogSubmit} disabled={busy}>{busy ? '处理中…' : codeRequested ? '验证并登录' : '发送验证码'}</button>
          {codeRequested ? <button className={loginStyles.secondary} type="button" disabled={busy} onClick={() => { setCodeRequested(false); setVerificationCode(''); setNotice(''); setError(''); }}>更换邮箱 / 重新获取</button> : null}
        </form> : null}
        {portal !== 'my' && passwordLoginEnabled && method === 'password' && !setupRequired ? <form className={styles.dialogForm} onSubmit={submitPassword}>
          <label>{copy.emailLabel}<input name="email" type="email" autoComplete="username" placeholder={copy.passwordPlaceholder} required /></label><label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
          <div className={loginStyles.pendingCapability} aria-disabled="true"><span>手机号登录</span><span className={loginStyles.pendingBadge}>待启用</span></div>
          <a className={loginStyles.resetLink} href="/reset-password">忘记密码？通过邮箱重置</a>
          {error ? <p className={styles.dialogError}>{error}</p> : null}<button className={styles.dialogSubmit} disabled={busy}>{busy ? '正在登录…' : '账户密码登录'}</button>
        </form> : null}
        {setupRequired ? <form className={styles.dialogForm} onSubmit={submitPasswordSetup}>
          <label>新密码<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required autoFocus /></label>
          <label>确认新密码<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          <p className={loginStyles.notice}>至少 8 位，并同时包含字母和数字。设置成功后，正常浏览 ALSVID 不再重复要求验证。</p>
          {notice ? <p className={loginStyles.notice}>{notice}</p> : null}{error ? <p className={styles.dialogError}>{error}</p> : null}
          <button className={styles.dialogSubmit} disabled={busy}>{busy ? '正在保存…' : '保存密码并进入 ALSVID'}</button>
        </form> : null}
      </section>
    </div> : null}
  </>;
}
