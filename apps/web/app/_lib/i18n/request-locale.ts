import { isIP } from 'node:net';
import geoip from 'geoip-country';
import { isLocale, preferredLocale, type Locale } from './routing.ts';

type RequestHeaders = { get(name: string): string | null };

// A presentation hint only: never use this forwarded IP for authorization.
// Cloud Run supplies X-Forwarded-For; no visitor IP is sent to a lookup service.
export function countryFromRequest(headers: RequestHeaders): string | null {
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip || !isIP(ip)) return null;
  return geoip.lookup(ip)?.country ?? null;
}

export function requestLocale(saved: unknown, headers: RequestHeaders): Locale {
  return isLocale(saved) ? saved : preferredLocale(undefined, countryFromRequest(headers));
}
