'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { translator, type Locale, type TranslationKey } from '../_lib/i18n';
import type { ProtectedPortalId } from '../_lib/portal-routing';
import { LanguageSwitcher } from './language-switcher';
import { PortalLoginBicycle } from './portal-login-bicycle';
import styles from './portal-login-scene.module.css';

export function PortalLoginScene({ portal, locale, open, busy, locked, formId, actionLabel, onOpen, onClose, children }: {
  portal: ProtectedPortalId; locale: Locale; open: boolean; busy: boolean; locked: boolean;
  formId: string; actionLabel: string; onOpen: () => void; onClose: () => void; children: ReactNode;
}) {
  const t = translator(locale);
  const action = useRef<HTMLButtonElement>(null);
  const [boosted, setBoosted] = useState(false);
  const [paused, setPaused] = useState(false);
  const close = () => { if (locked || busy) return; action.current?.focus(); setBoosted(false); onClose(); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open && !locked && !busy) { action.current?.focus(); setBoosted(false); onClose(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, locked, busy, onClose]);
  return <main lang={locale} data-portal-login={portal} data-open={open} className={[styles.page, open ? styles.open : '', paused ? styles.paused : ''].join(' ')}>
    <div className={styles.background} aria-hidden="true" /><div className={styles.dither} aria-hidden="true" />
    <header className={styles.header}>
      <a className={styles.logo} href={'https://www.alsvidbike.com/' + locale}>ALSVID</a>
      <div className={styles.headerLinks}><LanguageSwitcher locale={locale} label={t('auth.language')} /><a href={'https://www.alsvidbike.com/' + locale}>{t('auth.return')} ↗</a></div>
    </header>
    <div className={styles.stage}>
      <section className={styles.story}>
        <p className={styles.eyebrow}>{t(('auth.' + portal + '.eyebrow') as TranslationKey)}</p>
        <h1>{t(('auth.' + portal + '.line1') as TranslationKey)}<br />{t(('auth.' + portal + '.line2') as TranslationKey)}</h1>
        <p className={styles.lead}>{t(('auth.' + portal + '.lead') as TranslationKey)}</p>
      </section>
      <div className={styles.bicycle}><PortalLoginBicycle boosted={boosted && open} /></div>
      <section className={styles.access} aria-label={t('auth.form')}>
        <div id={formId + '-region'} className={styles.formArea} inert={!open}>{children}</div>
        <div className={styles.actionArea}>
          <button ref={action} className={styles.action} type={open ? 'submit' : 'button'} form={open ? formId : undefined}
            aria-expanded={open} aria-controls={formId + '-region'} disabled={busy}
            onPointerEnter={() => { if (!open) onOpen(); setBoosted(true); }}
            onPointerLeave={() => setBoosted(false)}
            onFocus={() => { if (!open) onOpen(); setBoosted(true); }}
            onBlur={() => setBoosted(false)}
            onClick={event => { if (!open) { event.preventDefault(); onOpen(); } }}>
            <span>{busy ? t('auth.busy') : open ? actionLabel : t(('auth.' + portal + '.entry') as TranslationKey)}</span><span aria-hidden="true">→</span>
          </button>
          {open && !locked ? <button type="button" className={styles.close} disabled={busy} onClick={close} aria-label={t('auth.close')}>×</button> : null}
        </div>
      </section>
    </div>
    <footer className={styles.footer}><button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{t('auth.background')} · {t(paused ? 'auth.play' : 'auth.pause')}</button><span>{t('auth.rights', { year: new Date().getFullYear() })}</span></footer>
  </main>;
}
