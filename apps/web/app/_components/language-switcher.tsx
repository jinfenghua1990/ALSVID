'use client';

import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { locales, localeCookie, localizedPath, type Locale } from '../_lib/i18n/routing';

/** Shared public-site switcher; explicit choices take precedence over browser hints. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  function select(event: MouseEvent<HTMLAnchorElement>, target: Locale) {
    document.cookie = `${localeCookie}=${target}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    location.assign(localizedPath(location.pathname === '/home' ? '/' : location.pathname, target) + location.search + location.hash);
  }
  return <nav aria-label={label} style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
    {locales.map(target => <a key={target} href={localizedPath(pathname === '/home' ? '/' : pathname, target)} hrefLang={target} lang={target} aria-current={target === locale ? 'page' : undefined} onClick={event => select(event, target)} style={{ fontWeight: target === locale ? 800 : 400, textDecoration: target === locale ? 'underline' : 'none', textUnderlineOffset: 4 }}>{target.toUpperCase()}</a>)}
  </nav>;
}
