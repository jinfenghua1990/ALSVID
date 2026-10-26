import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { effectiveHostname, isPublicWebsiteHostname } from './_lib/seo-host';

// The same Next app serves WWW, Admin, Dealer and My on distinct domains.
// Only the public WWW should be offered to crawlers.
export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const hostname = effectiveHostname(await headers());
  const publicHost = isPublicWebsiteHostname(hostname);
  if (!publicHost) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/login', '/my', '/dealer', '/supplier', '/settings', '/reset-password'],
    },
    sitemap: 'https://www.alsvidbike.com/sitemap.xml',
  };
}
