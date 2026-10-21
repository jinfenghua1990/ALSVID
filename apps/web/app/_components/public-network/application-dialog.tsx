'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { translator, type Locale } from '../../_lib/i18n';
import { DealerApplicationForm } from './application-form';
import styles from './network.module.css';

const DealerApplicationContext = createContext<(() => void) | null>(null);

export function DealerApplicationDialog({ locale, initialOpen = false, children }: {
  locale: Locale;
  initialOpen?: boolean;
  children: ReactNode;
}) {
  const t = translator(locale);
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  const close = useCallback(() => {
    setOpen(false);
    if (initialOpen) router.replace('/' + locale + '/dealers', { scroll: false });
  }, [initialOpen, locale, router]);

  const openDialog = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLInputElement>('input[name="companyName"]')?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) close();
  }

  return (
    <DealerApplicationContext.Provider value={openDialog}>
      {children}
      {open ? (
        <div className={styles.dialogOverlay} role="presentation" onMouseDown={closeFromBackdrop}>
          <section ref={dialogRef} className={styles.dialogPanel} role="dialog" aria-modal="true" aria-labelledby="dealer-application-dialog-title">
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>{t('network.apply.eyebrow')}</p>
                <h2 id="dealer-application-dialog-title">{t('network.apply.title')}</h2>
                <p>{t('network.apply.body')}</p>
              </div>
              <button type="button" className={styles.dialogClose} onClick={close} aria-label={t('common.close')}>×</button>
            </header>
            <div className={styles.dialogForm}>
              <DealerApplicationForm locale={locale} />
            </div>
          </section>
        </div>
      ) : null}
    </DealerApplicationContext.Provider>
  );
}

export function DealerApplicationTrigger({ children, className }: { children: ReactNode; className: string }) {
  const openDialog = useContext(DealerApplicationContext);
  if (!openDialog) throw new Error('DealerApplicationTrigger must be inside DealerApplicationDialog.');
  return <button type="button" className={className} onClick={openDialog}>{children}</button>;
}
