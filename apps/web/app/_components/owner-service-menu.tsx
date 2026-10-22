'use client';

import { useEffect, useRef, useState } from 'react';
import { translator, type Locale } from '../_lib/i18n';
import styles from './public-site-header.module.css';

/** Public navigation presents the two confirmed owner destinations without
 * silently logging the visitor in or mixing owner and service entitlements. */
export function OwnerServiceMenu({ locale, myUrl, mobile = false }: {
  locale: Locale;
  myUrl: string;
  mobile?: boolean;
}) {
  const t = translator(locale);
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const launchButton = useRef<HTMLButtonElement>(null);
  const prefix = '/' + locale;
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    function keyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    }
    document.addEventListener('keydown', keyDown);
    return () => {
      document.removeEventListener('keydown', keyDown);
      document.body.style.overflow = previous;
      launchButton.current?.focus();
    };
  }, [open]);
  return <>
    <button ref={launchButton} type="button"
      className={mobile ? styles.mobileLink : styles.navLink}
      aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)}>{t('navigation.owner_account')}</button>
    {open ? <div className={styles.ownerOverlay} onMouseDown={event => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <section className={styles.ownerDialog} role="dialog" aria-modal="true"
        aria-label={t('network.nav.owner')}>
        <div className={styles.ownerHeading}>
          <div><p>MY ALSVID / SERVICE</p><h2>{t('network.nav.owner')}</h2></div>
          <button ref={closeButton} className={styles.ownerClose}
            type="button" onClick={() => setOpen(false)}
            aria-label={t('common.close')}>×</button>
        </div>
        <div className={styles.ownerOptions}>
          <a href={myUrl} className={styles.ownerOption}>
            <span className={styles.ownerSymbol} aria-hidden="true">⌁</span>
            <strong>{t('network.service.owner')}</strong>
            <small>{t('service.vehicles.note')}</small>
            <span className={styles.ownerArrow} aria-hidden="true">›</span>
          </a>
          <a href={prefix + '/service-locations'} className={styles.ownerOption}>
            <span className={styles.ownerSymbol} aria-hidden="true">＋</span>
            <strong>{t('network.nav.service')}</strong>
            <small>{t('service.locations.note')}</small>
            <span className={styles.ownerArrow} aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </div> : null}
  </>;
}
