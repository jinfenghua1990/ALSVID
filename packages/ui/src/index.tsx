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

function NavigationItems({ navigation, activeClassName }: { navigation: readonly AppNavItem[]; activeClassName?: string }) {
  return (
    <>
      {navigation.map((item, index) => {
        const previousSection = index > 0 ? navigation[index - 1]?.section : undefined;
        const showSection = item.section && item.section !== previousSection;
        const content = (
          <>
            <span className="navLabel">{item.label}</span>
            {item.status ? <span className="navStatus">{item.status}</span> : null}
          </>
        );

        return (
          <div className="navEntry" key={`${item.href}-${item.label}`}>
            {showSection ? <div className="navSection">{item.section}</div> : null}
            {item.disabled ? (
              <span className="navItem navItemDisabled" aria-disabled="true">{content}</span>
            ) : (
              <a className={`navItem${item.active ? ` ${activeClassName ?? 'active'}` : ''}`} href={item.href}>{content}</a>
            )}
          </div>
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
      <section className={classNames.workspace ?? 'workspace'} id={workspaceId}>{children}</section>
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
