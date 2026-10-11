import type { PropsWithChildren, ReactNode } from 'react';

export interface AppNavItem {
  label: string;
  href: string;
  active?: boolean;
  section?: string;
  status?: string;
  disabled?: boolean;
}

export interface AppShellClassNames {
  shell?: string;
  rail?: string;
  brand?: string;
  nav?: string;
  active?: string;
  footer?: string;
  workspace?: string;
}

function NavigationItems({ navigation, activeClassName }: { navigation: readonly AppNavItem[]; activeClassName: string | undefined }) {
  return (
    <>
      {Array.from(new Set(navigation.map((item) => item.section ?? '导航'))).map((section) => {
        const items = navigation.filter((item) => (item.section ?? '导航') === section);
        return (
          <details className="navGroup" key={section} open={items.some((item) => item.active) || section === '总览'}>
            <summary className="navSection">{section}<span aria-hidden="true">⌄</span></summary>
            {items.map((item) => (
              <div className="navEntry" key={`${item.href}-${item.label}`}>
                {item.disabled ? (
                  <span className="navItem navItemDisabled" aria-disabled="true">
                    <span className="navLabel">{item.label}</span>
                    {item.status ? <span className="navStatus">{item.status}</span> : null}
                  </span>
                ) : (
                  <a className={`navItem${item.active ? ` ${activeClassName ?? 'active'}` : ''}`} href={item.href} aria-current={item.active ? 'page' : undefined}>
                    <span className="navLabel">{item.label}</span>
                    {item.status ? <span className="navStatus">{item.status}</span> : null}
                  </a>
                )}
              </div>
            ))}
          </details>
        );
      })}
    </>
  );
}

export function AppShell({
  children,
  navigation,
  brand = 'ALSVID',
  brandHref = '/',
  footer = 'ALSVID V1',
  workspaceId,
  classNames = {},
}: PropsWithChildren<{
  navigation: readonly AppNavItem[];
  brand?: ReactNode;
  brandHref?: string;
  footer?: ReactNode;
  workspaceId?: string;
  classNames?: AppShellClassNames;
}>) {
  return (
    <main className={classNames.shell ?? 'shell'}>
      <details className="mobileNav">
        <summary><strong>{brand}</strong><span>菜单</span></summary>
        <nav className="mobileNavPanel"><NavigationItems navigation={navigation} activeClassName={classNames.active} /></nav>
      </details>
      <aside className={classNames.rail ?? 'rail'}>
        <a className={classNames.brand ?? 'brand'} href={brandHref}>{brand}</a>
        <nav className={classNames.nav}>
          <NavigationItems navigation={navigation} activeClassName={classNames.active} />
        </nav>
        <div className={classNames.footer ?? 'railFoot'}>{footer}</div>
      </aside>
      <div className="adminBody">
        <header className="adminTopbar">
          <span>内部管理 <span aria-hidden="true">/</span> <strong>{navigation.find((item) => item.active)?.label ?? '工作台'}</strong></span>
          <a href="/portal-launcher">切换工作入口 ↗</a>
        </header>
        <section className={classNames.workspace ?? 'workspace'} id={workspaceId}>{children}</section>
      </div>
    </main>
  );
}

export function Surface({ children }: PropsWithChildren) {
  return <section data-alsvid-surface="true">{children}</section>;
}

export function SectionTitle({ eyebrow, children }: PropsWithChildren<{ eyebrow?: ReactNode }>) {
  return (
    <header>
      {eyebrow ? <div>{eyebrow}</div> : null}
      <h2>{children}</h2>
    </header>
  );
}

export function Notice({ children, role = 'status' }: PropsWithChildren<{ role?: 'status' | 'alert' }>) {
  return <div role={role} data-alsvid-notice="true">{children}</div>;
}

export function EmptyState({ children }: PropsWithChildren) {
  return <div data-alsvid-empty-state="true">{children}</div>;
}
