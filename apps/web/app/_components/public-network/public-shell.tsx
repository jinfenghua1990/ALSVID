import type { ReactNode } from 'react';
import { PublicSiteHeader } from '../public-site-header';
import { translator, type Locale } from '../../_lib/i18n';
import styles from './network.module.css';

export function PublicShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = translator(locale);
  const base = '/' + locale;
  const dealerLoginUrl = 'https://dealer.alsvidbike.com/login?portal=dealer&locale=' + locale + '&open=1';
  return <div className={styles.site}>
    <PublicSiteHeader locale={locale} active="dealers" dealerLogin />
    {children}
    <footer className={styles.footer}>
      <a className={styles.footerBrand} href={base + '/'}>ALSVID</a>
      <span>{t('network.shared.footer')}</span>
      <nav aria-label={t('navigation.primary')}>
        <a href={base + '/dealers'}>{t('network.nav.partnership')}</a>
        <a href={base + '/dealers/locations'}>{t('network.nav.locations')}</a>
        <a href={base + '/service-locations'}>{t('network.nav.service')}</a>
        <a href={dealerLoginUrl}>{t('network.nav.account')}</a>
      </nav>
    </footer>
  </div>;
}
