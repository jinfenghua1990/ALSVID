'use client';

import { useEffect, useState, type FormEvent } from 'react';
import styles from './security-policy.module.css';

interface SecurityPolicy {
  sessionTtlDays: number;
  forcePasswordSetup: boolean;
  riskStepUpEnabled: boolean;
  updatedAt: string;
}

interface SecurityPolicyResponse {
  data?: SecurityPolicy;
  message?: string;
}

export function SecurityPolicyEditor() {
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [sessionTtlDays, setSessionTtlDays] = useState(30);
  const [forcePasswordSetup, setForcePasswordSetup] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/settings/security-policy', { cache: 'no-store' });
        const payload = await response.json().catch(() => null) as SecurityPolicyResponse | null;
        if (!response.ok || !payload?.data) throw new Error(payload?.message ?? '无法读取登录安全策略');
        if (cancelled) return;
        setPolicy(payload.data);
        setSessionTtlDays(payload.data.sessionTtlDays);
        setForcePasswordSetup(payload.data.forcePasswordSetup);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '无法读取登录安全策略');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/settings/security-policy', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionTtlDays, forcePasswordSetup }),
      });
      const payload = await response.json().catch(() => null) as SecurityPolicyResponse | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.message ?? '保存失败');
      setPolicy(payload.data);
      setSessionTtlDays(payload.data.sessionTtlDays);
      setForcePasswordSetup(payload.data.forcePasswordSetup);
      setNotice('登录安全策略已保存。新的会话有效期从下一次登录开始生效。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>SECURITY / SIGN-IN</p><h1>登录安全</h1><span>管理 ALSVID 的会话保持和首次登录密码初始化规则。</span></div>
        <span className={styles.status}>当前规则 · {policy ? '已载入' : '读取中'}</span>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.eyebrow}>登录方式</span>
          <h2>邮箱身份</h2>
          <p>公司邮箱验证码用于身份验证与账号初始化；已设置个人密码后，也可以使用邮箱 + 密码登录。</p>
          <div className={styles.rule}><b>邮箱验证码</b><strong>启用</strong></div>
          <div className={styles.rule}><b>邮箱 + 密码</b><strong>启用</strong></div>
          <div className={styles.rule}><b>手机号</b><em>待启用</em></div>
        </article>

        <article className={styles.card}>
          <span className={styles.eyebrow}>首次登录</span>
          <h2>密码初始化</h2>
          <p>开启后，新账号或仍在使用初始密码的账号必须先设置个人密码；在完成前无法进入普通业务 API。</p>
          <div className={styles.rule}><b>当前状态</b><strong>{forcePasswordSetup ? '强制设置个人密码' : '允许验证码会话直接进入'}</strong></div>
        </article>

        <article className={styles.card}>
          <span className={styles.eyebrow}>会话</span>
          <h2>保持登录</h2>
          <p>登录成功后在有效期内刷新、页面跳转和正常业务访问不会再次要求登录。</p>
          <div className={styles.rule}><b>新会话有效期</b><strong>{sessionTtlDays} 天</strong></div>
        </article>

        <article className={styles.card}>
          <span className={styles.eyebrow}>风险验证</span>
          <h2>敏感操作二次验证</h2>
          <p>该能力保留给修改邮箱、权限提升、关键安全配置等高风险动作，不用于普通页面跳转。</p>
          <div className={styles.rule}><b>Step-up / MFA</b><em>{policy?.riskStepUpEnabled ? '策略已开启，执行器待接入' : '预留'}</em></div>
        </article>
      </section>

      <form className={styles.form} onSubmit={save}>
        <div className={styles.formHeading}><div><p>可配置规则</p><h2>当前生效策略</h2></div><small>只有 system_admin / identity.role.manage 可以修改</small></div>
        <label className={styles.field}>
          <span><b>会话有效期</b><small>1–90 天；修改只影响后续新登录建立的会话。</small></span>
          <input type="number" min={1} max={90} value={sessionTtlDays} onChange={(event) => setSessionTtlDays(Number(event.target.value))} required />
        </label>
        <label className={styles.toggle}>
          <span><b>首次登录强制设置个人密码</b><small>建议保持开启。初始密码 / 无密码账号必须完成二级设置窗口。</small></span>
          <input type="checkbox" checked={forcePasswordSetup} onChange={(event) => setForcePasswordSetup(event.target.checked)} />
        </label>
        {policy?.updatedAt ? <p className={styles.updated}>上次策略更新时间：{new Date(policy.updatedAt).toLocaleString()}</p> : null}
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" disabled={busy || !policy}>{busy ? '正在保存…' : '保存登录安全策略'}</button>
      </form>
    </main>
  );
}
