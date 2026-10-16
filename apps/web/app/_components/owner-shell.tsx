import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@alsvid/ui';
import styles from './owner-shell.module.css';
import { portalUrlFor } from '../_lib/portal-routing';
import { headers } from 'next/headers';

const ownerNavigation = [
  { label: '首页', href: '/my' },
  { label: '我的车辆', href: '/my/vehicles' },
  { label: '服务', href: '/my/service' },
  { label: '我的账户', href: '/my/account' },
] as const;

function isActive(href: string, activeHref: string) {
  if (href === '/my') return activeHref === '/my';
  if (href === '/my/vehicles') return activeHref.startsWith('/my/vehicles');
  if (href === '/my/service') return activeHref.startsWith('/my/service');
  if (href === '/my/account') return activeHref.startsWith('/my/account');
  return activeHref === href;
}

export async function OwnerShell({ activeHref, children }: { activeHref: string; children: ReactNode }) {
  const requestHeaders = await headers();
  const officialHomeUrl = portalUrlFor(requestHeaders.get('host') ?? 'localhost:3000', 'www');

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
            <a className={styles.officialHome} href={officialHomeUrl} target="_blank" rel="noopener noreferrer">
              官方首页 <span aria-hidden="true">↗</span>
            </a>
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
