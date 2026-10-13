import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@alsvid/ui';
import styles from './owner-shell.module.css';

const ownerNavigation = [
  { label: '我的车辆', href: '/my/vehicles' },
  { label: '服务', href: '/my/service' },
  { label: '配件', href: '/my/library#accessories' },
  { label: '帮助', href: '/my/library#help' },
] as const;

function isActive(href: string, activeHref: string) {
  const base = href.split('#')[0];
  if (base === '/my/vehicles') return activeHref.startsWith('/my/vehicles');
  if (base === '/my/service') return activeHref.startsWith('/my/service');
  if (base === '/my/library') return activeHref.startsWith('/my/library');
  return activeHref === base;
}

export function OwnerShell({ activeHref, children }: { activeHref: string; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identity}>
            <Link className={styles.brand} href="/my">ALSVID</Link>
            <span className={styles.divider} aria-hidden="true" />
            <Link className={styles.portalName} href="/my">My ALSVID</Link>
          </div>

          <nav className={styles.navigation} aria-label="My ALSVID 导航">
            {ownerNavigation.map((item) => (
              <Link
                className={`${styles.navLink}${isActive(item.href, activeHref) ? ` ${styles.navActive}` : ''}`}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.tools}>
            <ThemeToggle />
            <Link className={`${styles.account}${activeHref.startsWith('/my/account') ? ` ${styles.accountActive}` : ''}`} href="/my/account">
              账户
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div><strong>ALSVID</strong><span>Vehicle ownership, service and support.</span></div>
        <span>My ALSVID</span>
      </footer>
    </div>
  );
}
