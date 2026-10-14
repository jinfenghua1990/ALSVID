import type { IdentityPasswordResetDelivery, IdentityVerificationDelivery } from '@alsvid/identity';

class UnconfiguredVerificationDelivery implements IdentityVerificationDelivery {
  readonly configured = false;
  async sendCode(): Promise<void> { throw new Error('Identity verification mail is not configured'); }
}

class UnconfiguredPasswordResetDelivery implements IdentityPasswordResetDelivery {
  readonly configured = false;
  async sendResetEmail(): Promise<void> { throw new Error('Password reset mail is not configured'); }
}

class ConsoleDelivery implements IdentityVerificationDelivery, IdentityPasswordResetDelivery {
  readonly configured = true;

  async sendCode(input: { email: string; code: string; expiresAt: Date }): Promise<void> {
    console.info('[ALSVID local email verification]', {
      email: input.email,
      code: input.code,
      expiresAt: input.expiresAt.toISOString(),
    });
  }

  async sendResetEmail(input: { email: string; displayName: string; resetUrl: string; expiresAt: Date }): Promise<void> {
    console.info('[ALSVID local password reset]', {
      email: input.email,
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt.toISOString(),
    });
  }
}

class ResendDelivery implements IdentityVerificationDelivery, IdentityPasswordResetDelivery {
  readonly configured = true;

  constructor(private readonly apiKey: string, private readonly from: string) {}

  async sendCode(input: { email: string; code: string; expiresAt: Date }): Promise<void> {
    await this.send({
      to: input.email,
      subject: 'ALSVID 登录验证码',
      text: `您的 ALSVID 登录验证码是 ${input.code}。验证码将在 10 分钟内失效。如非本人操作，请忽略此邮件。`,
      html: `<html lang="zh-CN"><body><h2>ALSVID 登录验证</h2><p>您的验证码：</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${escapeHtml(input.code)}</p><p>验证码将在 10 分钟内失效。如非本人操作，请忽略此邮件。</p></body></html>`,
    });
  }

  async sendResetEmail(input: { email: string; displayName: string; resetUrl: string; expiresAt: Date }): Promise<void> {
    await this.send({
      to: input.email,
      subject: '重置 ALSVID 密码',
      text: `你好 ${input.displayName || 'ALSVID 用户'}，

请使用以下链接重置密码：
${input.resetUrl}

此链接将在 30 分钟后失效。如果不是你发起的请求，可以忽略此邮件。`,
      html: `<html lang="zh-CN"><body><h2>重置 ALSVID 密码</h2><p>你好 ${escapeHtml(input.displayName || 'ALSVID 用户')}，</p><p>请点击下面的按钮设置新密码。链接将在 30 分钟后失效。</p><p><a href="${escapeHtml(input.resetUrl)}">重置密码</a></p><p>如果按钮无法打开，请复制此地址：</p><p>${escapeHtml(input.resetUrl)}</p><p>如果不是你发起的请求，可以忽略此邮件。</p></body></html>`,
    });
  }

  private async send(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: this.from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('ALSVID email delivery failed', { status: response.status, detail: detail.slice(0, 300) });
      throw new Error(`Mail provider rejected email (${response.status})`);
    }
  }
}

export function createIdentityVerificationDelivery(): IdentityVerificationDelivery {
  const provider = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'console') {
    const testMode = process.env.ALSVID_EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
    return testMode ? new ConsoleDelivery() : new UnconfiguredVerificationDelivery();
  }
  if (provider === 'resend') {
    const apiKey = process.env.MAIL_API_KEY?.trim();
    const from = mailFrom();
    if (apiKey && from) return new ResendDelivery(apiKey, from);
  }
  return new UnconfiguredVerificationDelivery();
}

export function createIdentityPasswordResetDelivery(): IdentityPasswordResetDelivery {
  const provider = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'console') {
    const testMode = process.env.ALSVID_EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
    return testMode ? new ConsoleDelivery() : new UnconfiguredPasswordResetDelivery();
  }
  if (provider === 'resend') {
    const apiKey = process.env.MAIL_API_KEY?.trim();
    const from = mailFrom();
    if (apiKey && from) return new ResendDelivery(apiKey, from);
  }
  return new UnconfiguredPasswordResetDelivery();
}

function mailFrom(): string | null {
  const address = process.env.MAIL_FROM_ADDRESS?.trim();
  if (!address) return null;
  const name = process.env.MAIL_FROM_NAME?.trim();
  return name ? `${name} <${address}>` : address;
}

function escapeHtml(value: string): string {
  const escaped: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => escaped[character] ?? character);
}

export function identityRegistrationConfigFromEnv() {
  const approvedEmailDomains = (process.env.ALSVID_INTERNAL_EMAIL_DOMAINS ?? '')
    .split(/[;,]/)
    .map((value) => value.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return {
    approvedEmailDomains,
    registrationMode: process.env.ALSVID_INTERNAL_REGISTRATION_MODE === 'invite_only' ? 'invite_only' as const : 'company_domain' as const,
    initialAdminEmail: process.env.ALSVID_INITIAL_ADMIN_EMAIL?.trim().toLowerCase() || null,
    exposeTestCode:
      process.env.MAIL_PROVIDER?.trim().toLowerCase() === 'console'
      && process.env.ALSVID_EMAIL_TEST_MODE === 'true'
      && process.env.NODE_ENV !== 'production',
  };
}
