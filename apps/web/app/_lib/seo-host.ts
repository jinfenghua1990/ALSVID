/** Resolve the public hostname seen by the original visitor behind Cloud Run / proxies. */
export const canonicalWwwHost = 'www.alsvidbike.com';

type HeaderReader = { get(name: string): string | null };

export function effectiveHostname(headers: HeaderReader, fallback = ''): string {
  const raw = headers.get('x-forwarded-host') || headers.get('host') || fallback;
  return (raw.split(',')[0]?.trim().toLowerCase() ?? '').replace(/:\d+$/, '');
}

export function isPublicWebsiteHostname(host: string): boolean {
  return host === canonicalWwwHost || host === 'alsvidbike.com'
    || host === 'localhost' || host === '127.0.0.1';
}

export function shouldRedirectToCanonicalWww(host: string): boolean {
  return host === 'alsvidbike.com';
}
