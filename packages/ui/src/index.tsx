import type { PropsWithChildren, ReactNode } from 'react';

export interface AppNavItem {
  label: string;
  href: string;
  active?: boolean;
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
      <aside className={classNames.rail ?? 'rail'}>
        <a className={classNames.brand ?? 'brand'} href={brandHref}>{brand}</a>
        <nav className={classNames.nav}>
          {navigation.map((item) => (
            <a key={`${item.href}-${item.label}`} className={item.active ? classNames.active ?? 'active' : undefined} href={item.href}>
              {item.label}
            </a>
          ))}
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
