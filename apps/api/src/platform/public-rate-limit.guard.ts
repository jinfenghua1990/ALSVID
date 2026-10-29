import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_RATE_LIMIT, type PublicRateLimitOptions } from './public-rate-limit.decorator.js';

interface Window {
  count: number;
  resetAt: number;
}

interface LimitedRequest {
  ip?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface LimitedResponse {
  header?: (name: string, value: string) => unknown;
}

const SWEEP_THRESHOLD = 10_000;

function bodyEmail(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const value = (body as Record<string, unknown>).email;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().slice(0, 254);
  return normalized || null;
}

function clientAddress(request: LimitedRequest): string {
  if (request.ip?.trim()) return request.ip.trim();
  const forwarded = request.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first?.split(',')[0]?.trim() || 'unknown';
}

/**
 * Fixed-window limiter for public, unauthenticated writes. It is transport-level
 * abuse control, not a business rule, and is intentionally in-process: a durable
 * cross-instance limiter is a separate follow-up. Configure the API with a
 * trusted proxy so `request.ip` is the caller and not the gateway.
 */
@Injectable()
export class PublicRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<PublicRateLimitOptions | undefined>(PUBLIC_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;
    if (process.env.ALSVID_PUBLIC_RATE_LIMIT_DISABLED === 'true') return true;

    const request = context.switchToHttp().getRequest<LimitedRequest>();
    const scope = `${context.getClass().name}.${context.getHandler().name}`;
    const buckets: Array<[string, number]> = [];
    if (options.perClient) buckets.push([`client:${clientAddress(request)}`, options.perClient]);
    const email = bodyEmail(request.body);
    if (options.perEmail && email) buckets.push([`email:${email}`, options.perEmail]);
    if (options.perInstance) buckets.push(['instance', options.perInstance]);

    this.sweep();
    const now = Date.now();
    for (const [target, limit] of buckets) {
      const key = `${scope}:${target}`;
      const window = this.windows.get(key);
      if (!window || window.resetAt <= now) {
        this.windows.set(key, { count: 1, resetAt: now + options.windowMs });
        continue;
      }
      if (window.count >= limit) {
        const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
        context.switchToHttp().getResponse<LimitedResponse>()?.header?.('retry-after', String(retryAfter));
        throw new HttpException(
          { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many requests. Please retry later.', retryAfter },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      window.count += 1;
    }
    return true;
  }

  private sweep(): void {
    if (this.windows.size < SWEEP_THRESHOLD) return;
    const now = Date.now();
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}
