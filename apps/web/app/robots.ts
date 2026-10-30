import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { effectiveHostname, isPublicWebsiteHostname } from './_lib/seo-host';
import { locales } from './_lib/i18n/routing';

// The same Next app serves WWW, Admin, Dealer, Supplier and My on distinct domains.
// Only the public WWW should be generally offered to crawlers. Portal login routes
// are the exception: let crawlers read their noindex directive so their URLs do
// not remain eligible for indexing merely because robots.txt hides their content.
export const dynamic = 'force-dynamic';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const hostname = effectiveHostname(await headers());
  const publicHost = isPublicWebsiteHostname(hostname);
  if (!publicHost) {
    return {
      rules: {
        userAgent: '*',
        allow: ['/login', ...locales.map((locale) => `/${locale}/login`)],
        disallow: '/',
      },
    };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/login', '/my', '/dealer', '/supplier', '/settings', '/reset-password'],
    },
    sitemap: 'https://www.alsvidbike.com/sitemap.xml',
  };
}
