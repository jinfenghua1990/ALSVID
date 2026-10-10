import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ShopifyWebhookVerifier {
  verify(rawBody: Uint8Array, signatureBase64: string): boolean;
}

class HmacShopifyWebhookVerifier implements ShopifyWebhookVerifier {
  private readonly secret: string;

  constructor(secret: string) {
    if (!secret.trim()) throw new Error('Shopify webhook secret is required');
    this.secret = secret;
  }

  verify(rawBody: Uint8Array, signatureBase64: string): boolean {
    if (!signatureBase64) return false;
    const expected = createHmac('sha256', this.secret).update(rawBody).digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(signatureBase64, 'base64');
    } catch {
      return false;
    }
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(provided, expected);
  }
}

export function createShopifyWebhookVerifier(secret: string): ShopifyWebhookVerifier {
  return new HmacShopifyWebhookVerifier(secret);
}
