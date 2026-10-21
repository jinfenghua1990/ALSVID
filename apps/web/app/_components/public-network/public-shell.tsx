import type { ReactNode } from 'react';
import { LanguageSwitcher } from '../language-switcher';
import { translator, type Locale } from '../../_lib/i18n';
import styles from './network.module.css';

export function PublicShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = translator(locale);
  const base = '/' + locale;
  return <div className={styles.site}>
    <header className={styles.header}>
      <a className={styles.logo} href={base + '/'} aria-label="ALSVID">
        <img src="/home/alsvid-bike-motion.svg" width="61" height="35" alt="" />
        <span>ALSVID</span>
      </a>
      <nav className={styles.nav} aria-label={t('navigation.primary')}>
        <a href={base + '/dealers'}>{t('network.nav.partnership')}</a>
        <a className={styles.navApply} href={base + '/dealers#apply'}>{t('network.nav.apply')}</a>
        <a href={base + '/dealers/locations'}>{t('network.nav.locations')}</a>
        <a href={base + '/service-locations'}>{t('network.nav.service')}</a>
      </nav>
      <div className={styles.headerRight}>
        <LanguageSwitcher locale={locale} label={t('navigation.language')} />
        <a className={styles.headerLogin} href="https://dealer.alsvidbike.com">{t('network.nav.account')} <span aria-hidden="true">↗</span></a>
        <a className={styles.headerHome} href={base + '/'}>{t('network.nav.home')} ↗</a>
      </div>
    </header>
    {children}
    <footer className={styles.footer}>
      <a className={styles.footerBrand} href={base + '/'}>ALSVID</a>
      <span>{t('network.shared.footer')}</span>
      <nav aria-label={t('navigation.primary')}>
        <a href={base + '/dealers'}>{t('network.nav.partnership')}</a>
        <a href={base + '/dealers/locations'}>{t('network.nav.locations')}</a>
        <a href={base + '/service-locations'}>{t('network.nav.service')}</a>
        <a href="https://dealer.alsvidbike.com">{t('network.nav.account')}</a>
      </nav>
    </footer>
  </div>;
}
