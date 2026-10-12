import type { PropsWithChildren, ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

export { ThemeToggle } from './theme-toggle';

export interface AppNavItem {
  label: string;
  href: string;
  active?: boolean;
  area?: string;
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
          <details className="navGroup" key={section} open={items.some((item) => item.active) || navigation.length <= 8}>
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
  brandHref = '/admin',
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
  const activeItem = navigation.find((item) => item.active);
  const activeArea = activeItem?.area ?? activeItem?.section ?? '首页';
  const contextualNavigation = navigation.filter((item) => (item.area ?? item.section ?? '首页') === activeArea);
  const areas = Array.from(new Set(navigation.map((item) => item.area ?? item.section ?? '首页'))).map((label) => {
    const items = navigation.filter((item) => (item.area ?? item.section ?? '首页') === label);
    const enabled = items.find((item) => !item.disabled);
    return { label, href: enabled?.href ?? '#', disabled: !enabled, active: label === activeArea };
  });

  return (
    <main className={`shellV2 ${classNames.shell ?? ''}`.trim()} data-alsvid-app-shell="true">
      <header className="primaryHeader">
        <a className={`primaryBrand ${classNames.brand ?? ''}`.trim()} href={brandHref}>{brand}</a>
        <nav className="primaryNavigation" aria-label="一级导航">
          {areas.map((area) => area.disabled ? (
            <span className="primaryNavItem primaryNavItemDisabled" key={area.label} aria-disabled="true">{area.label}</span>
          ) : (
            <a className={`primaryNavItem${area.active ? ' primaryNavItemActive' : ''}`} href={area.href} key={area.label} aria-current={area.active ? 'page' : undefined}>{area.label}</a>
          ))}
        </nav>
        <div className="primaryUtilities" aria-label="快捷工具">
          <button className="utilityButton" type="button" aria-label="搜索（待接入）" title="搜索（待接入）" disabled>⌕</button>
          <ThemeToggle />
          <button className="utilityButton utilityNotify" type="button" aria-label="通知（待接入）" title="通知（待接入）" disabled>♢</button>
          <a className="primaryProfile" href="/portal-launcher" aria-label="工作入口">
            <span className="profileAvatar">A</span>
            <span className="profileCopy"><strong>管理员</strong><small>ALSVID</small></span>
            <span aria-hidden="true">⌄</span>
          </a>
        </div>
      </header>

      <nav className="contextNavigation" aria-label={`${activeArea} 快捷导航`}>
        <div className="contextNavigationInner">
          <strong className="contextNavigationTitle">{activeArea}</strong>
          {contextualNavigation.map((item) => item.disabled ? (
            <span className="contextNavItem contextNavItemDisabled" key={`${item.href}-${item.label}`} aria-disabled="true">
              {item.label}{item.status ? <small>{item.status}</small> : null}
            </span>
          ) : (
            <a className={`contextNavItem${item.active ? ' contextNavItemActive' : ''}`} href={item.href} key={`${item.href}-${item.label}`} aria-current={item.active ? 'page' : undefined}>
              {item.label}{item.status ? <small>{item.status}</small> : null}
            </a>
          ))}
        </div>
      </nav>

      <details className="mobileNav mobileNavV2">
        <summary><strong>{brand}</strong><span>{activeArea} · 菜单</span></summary>
        <div className="mobilePrimaryNavigation" aria-label="一级导航">
          {areas.map((area) => area.disabled ? (
            <span className="mobilePrimaryItem mobilePrimaryItemDisabled" key={area.label}>{area.label}</span>
          ) : (
            <a className={`mobilePrimaryItem${area.active ? ' mobilePrimaryItemActive' : ''}`} href={area.href} key={area.label}>{area.label}</a>
          ))}
        </div>
        <nav className="mobileNavPanel"><NavigationItems navigation={contextualNavigation} activeClassName={classNames.active} /></nav>
        <div className={classNames.footer ?? 'railFoot'}>{footer}</div>
      </details>

      <div className="shellFrame">
        <div className="adminBody">
          <section className={`workspace ${classNames.workspace ?? ''}`.trim()} id={workspaceId} data-alsvid-workspace="true">{children}</section>
        </div>
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
