import type { IdentityVerificationDelivery } from '@alsvid/identity';

class UnconfiguredVerificationDelivery implements IdentityVerificationDelivery {
  readonly configured = false;
  async sendCode(): Promise<void> { throw new Error('Identity verification mail is not configured'); }
}

class ConsoleVerificationDelivery implements IdentityVerificationDelivery {
  readonly configured = true;
  async sendCode(input: { email: string; code: string; expiresAt: Date }): Promise<void> {
    console.info('[ALSVID Development email verification]', {
      email: input.email,
      code: input.code,
      expiresAt: input.expiresAt.toISOString(),
    });
  }
}

class ResendVerificationDelivery implements IdentityVerificationDelivery {
  readonly configured = true;
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async sendCode(input: { email: string; code: string; expiresAt: Date }): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.email],
        subject: 'ALSVID 登录验证码',
        text: `您的 ALSVID 登录验证码是 ${input.code}。验证码将在 10 分钟内失效。如非本人操作，请忽略此邮件。`,
        html: `<div style="font-family:Arial,sans-serif;color:#142332"><h2>ALSVID 登录验证</h2><p>您的验证码：</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${input.code}</p><p>验证码将在 10 分钟内失效。如非本人操作，请忽略此邮件。</p></div>`,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('ALSVID verification email delivery failed', { status: response.status, detail: detail.slice(0, 300) });
      throw new Error(`Mail provider rejected verification email (${response.status})`);
    }
  }
}

export function createIdentityVerificationDelivery(): IdentityVerificationDelivery {
  const provider = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'console') {
    const testMode = process.env.ALSVID_EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production';
    return testMode ? new ConsoleVerificationDelivery() : new UnconfiguredVerificationDelivery();
  }
  if (provider === 'resend') {
    const apiKey = process.env.MAIL_API_KEY?.trim();
    const from = process.env.MAIL_FROM_ADDRESS?.trim();
    if (apiKey && from) return new ResendVerificationDelivery(apiKey, from);
  }
  return new UnconfiguredVerificationDelivery();
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
    exposeTestCode: process.env.ALSVID_EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production',
  };
}
