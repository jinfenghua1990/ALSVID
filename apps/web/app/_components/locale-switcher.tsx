'use client';

import { t, type Locale } from '../_lib/i18n';
import styles from '../home.module.css';

const localeLabels: Record<Locale, string> = { de: 'DE', en: 'EN' };

export function LocaleSwitcher({ locale, mode = 'path' }: { locale: Locale; mode?: 'path' | 'query' }) {
  const changeLocale = (nextLocale: Locale) => {
    document.cookie = `alsvid-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    const path = window.location.pathname;
    if (mode === 'query') {
      const search = new URLSearchParams(window.location.search);
      search.set('locale', nextLocale);
      window.location.assign(`${path}?${search.toString()}${window.location.hash}`);
      return;
    }
    const match = path.match(/^\/(de|en)(?=\/|$)/);
    const nextPath = match
      ? path.replace(/^\/(de|en)(?=\/|$)/, `/${nextLocale}`)
      : `/${nextLocale}/`;
    window.location.assign(`${nextPath}${window.location.search}${window.location.hash}`);
  };

  return (
    <div className={styles.localeSwitcher} role="group" aria-label={t(locale, 'navigation.language')}>
      {(Object.keys(localeLabels) as Locale[]).map((item) => (
        <button
          key={item}
          type="button"
          aria-current={locale === item ? 'true' : undefined}
          aria-pressed={locale === item}
          onClick={() => changeLocale(item)}
        >
          {localeLabels[item]}
        </button>
      ))}
    </div>
  );
}
