'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { locales, localeLabels, localeNativeLabels, localeCookie, localizedPath, type Locale } from '../_lib/i18n/routing';
import styles from './language-switcher.module.css';

/** Shared public-site switcher; explicit choices take precedence over browser hints. */
export function LanguageSwitcher({ locale, label, variant = 'inline' }: { locale: Locale; label: string; variant?: 'inline' | 'globe' }) {
  const pathname = usePathname();
  const dropdown = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (variant !== 'globe') return;
    function dismiss(event: PointerEvent) {
      if (dropdown.current && !dropdown.current.contains(event.target as Node)) dropdown.current.open = false;
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [variant]);
  function select(event: MouseEvent<HTMLAnchorElement>, target: Locale) {
    document.cookie = `${localeCookie}=${target}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    location.assign(localizedPath(location.pathname === '/home' ? '/' : location.pathname, target) + location.search + location.hash);
  }
  const links = locales.map(target => <a key={target} href={localizedPath(pathname === '/home' ? '/' : pathname, target)} hrefLang={target} lang={target} aria-current={target === locale ? 'page' : undefined} onClick={event => select(event, target)} style={{ fontWeight: target === locale ? 800 : 400, textDecoration: target === locale ? 'underline' : 'none', textUnderlineOffset: 4 }}>{variant === 'globe' ? localeNativeLabels[target] : localeLabels[target]}</a>);
  if (variant === 'globe') return <details className={styles.switcher} ref={dropdown} onKeyDown={event => {
    if (event.key === 'Escape' && dropdown.current) {
      dropdown.current.open = false;
      dropdown.current.querySelector('summary')?.focus();
    }
  }}>
    <summary aria-label={label} title={label} className={styles.trigger}>
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="11.5" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="14" cy="14" rx="5.5" ry="11.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 14h22M5 8.5h18M5 19.5h18" stroke="currentColor" strokeWidth="1.5"/></svg>
    </summary>
    <nav aria-label={label} className={styles.menu} style={{display:'grid'}}>{links}</nav>
  </details>;
  return <nav aria-label={label} style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
    {links}
  </nav>;
}
